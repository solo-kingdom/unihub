## Context

当前 `DatasourcePage.tsx` 的编辑弹窗使用 `<Form preserve={false}>` 配置。antd 6.3.x 存在已知 bug（[#57375](https://github.com/ant-design/ant-design/issues/57375)）：当 `preserve={false}` 时，对条件渲染的 Form.Item（如 `{currentImplMeta && ...}` 包裹的 config 字段）调用 `form.setFieldsValue` 不生效。

前两次修复（`a99c433` → 引入 watch-based namespace 自动查询；`ed48900` → 移除 `destroyOnHidden`、改为同步 `setFieldsValue`）均未触及根因——两者都在「调整设值时机」上做文章，但 `preserve={false}` 与条件渲染字段的 `setFieldsValue` 在 antd 6.3.x 中根本不兼容。

Aerospike namespace 当前为单值文本输入。用户在 DatasourcePage 需手动输入，在 DataQueryPage 无法切换。

存储层 `createAerospikeStorage` 仅创建单个 Instance，不支持多 namespace。

## Goals / Non-Goals

**Goals:**
- 编辑弹窗打开后，所有字段（名称、类型、实现 + 动态 config 字段）正确回显已保存值
- Aerospike 数据源表单中，通过测试连接自动拉取可用 namespace 列表，namespace 字段支持多选
- 后端支持多 namespace 配置（逗号分隔字符串 → 多个 Instance）
- 数据查询页面 namespace 下拉框可切换，并重新查询 keys

**Non-Goals:**
- 不修改 antd 版本（保持在 6.3.7）
- 不修改后端 API 签名（现有 endpoint 不变）
- 不改变非 Aerospike 数据源在表单和查询页的行为
- 不处理 Aerospike 的 set 字段多值（仅 namespace 多值）

## Decisions

### D1: 移除 `preserve={false}`，config 字段改 useEffect 设值

**选择**: `<Form>` 使用默认 `preserve={true}`，config 字段值在 `useEffect` 中设置（依赖 `[modalOpen, editingDs, currentImplMeta]`），确保 Form.Item 已挂载后再设值。

**替代方案与理由**:
- ❌ 保持 `preserve={false}` + 调整 `setFieldsValue` 时序 → antd bug #57375 未修复，不管怎么调时序都无效
- ❌ `setTimeout(() => form.setFieldsValue(...), 0)` → hack 做法，不可靠，可能闪烁
- ❌ 使用 Form 的 `initialValues` → 对动态 config 字段不适用（字段名和数量根据 impl 动态变化）
- ❌ 使用 `getContainer={false}` 改变 Modal 渲染 → 治标不治本
- ✅ `preserve={true}` + `useEffect` → 最鲁棒：preserve 不存在 bug，useEffect 自然等到 state（`editingDs`、`currentImplMeta`）更新、DOM 挂载完成后执行

**实现要点**:
- `handleOpenEdit` 中仅同步设置始终在 DOM 中的字段：`name`、`typeId`、`implId`
- 新增 `useEffect` 监听 `[modalOpen, editingDs, currentImplMeta]`，在其中设置所有 `config_*` 字段
- 新增和编辑的 `testResult` 重置时机不变
- namespace 相关状态（`namespaceOptions`、`namespaceLoading`）在切换实现时重置

### D2: namespace 通过测试连接自动拉取，表单中使用多选 Select

**选择**: 将测试连接结果中的 namespace 列表存入组件状态 `namespaceOptions`，namespace 字段渲染为 `<Select mode="multiple">`，选项来自最新一次成功的测试连接结果。

**替代方案与理由**:
- ❌ watch host/port 自动查询（`a99c433` 的做法）→ 已被 `ed48900` 移除，原因：时机不可控、编辑模式下需额外处理、代码复杂
- ❌ 手动输入 + 测试连接仅显示 info → 不支持多值
- ❌ 单独"查询命名空间"按钮 → 增加操作步骤
- ✅ 测试连接成功后自动查询并缓存 → 用户操作流程自然（测试连接是必然步骤），结果缓存到表单组件状态中持久可用

**交互流程**:
```
用户填写 host/port → 点击"测试连接"
  → 连接成功 → 自动查询 namespace → Select 下拉框展示可用 namespace（多选）
  → 连接失败 → namespace 保持为可手动输入的文本模式（降级）
```

### D3: 后端 namespace 配置支持逗号分隔多值

**选择**: `config["namespace"]` 存储逗号分隔的 namespace 字符串（如 `"test,prod,staging"`），`createAerospikeStorage` 解析后为每个 namespace 创建独立的 `aerospike.Instance`。

**替代方案与理由**:
- ❌ JSON 数组字符串（如 `["test","prod"]`）→ 增加序列化复杂度，与现有 `map[string]string` config 模型不一致
- ✅ 逗号分隔字符串 → 与现有 config 模型兼容（`map[string]string`），解析简单，向后兼容（单值 `"test"` 解析为一个 namespace）

**Instance 创建逻辑**:
```go
namespaces := strings.Split(config["namespace"], ",")
var instances []*aerospike.Instance
for i, ns := range namespaces {
    ns = strings.TrimSpace(ns)
    if ns == "" { continue }
    instances = append(instances, &aerospike.Instance{
        ID:        fmt.Sprintf("ns-%d", i),
        Host:      host,
        Port:      port,
        Namespace: ns,
        Set:       setName,
    })
}
```

### D4: DataQueryPage namespace 动态切换

**选择**: 引入本地状态 `activeNamespace`（初始值为 datasource 配置中保存的 namespace），Select 的 `value` 绑定 `activeNamespace`，`onChange` 更新状态并触发重新查询 keys。

**替代方案与理由**:
- ❌ 直接修改 datasource.config.namespace → 会导致持久化存储被意外修改
- ✅ 本地状态管理当前选中的 namespace → 临时切换，不影响持久化配置

**key 查询适配**: 当前 `fetchKeys` 调用 `dataApi.listKeys(dsName, pattern)`。Aerospike 的 `List` 操作当前返回 `"list operation is not supported by aerospike"`（见 `aerospikeAdapter.List`），所以 namespace 切换的实际效果需要在后续迭代中完善（当前至少让 UI 可切换，不再只读）。

## Risks / Trade-offs

- **[Risk] antd 未来版本可能修复 #57375，但本项目版本已固定 → Mitigation**: 不依赖框架修复，用 `preserve={true}` 规避所有版本
- **[Risk] `useEffect` 方式下，config 字段值会出现短暂空白（render → effect 之间的一帧） → Mitigation**: 非常短暂（1 microtask），用户不可感知；且 `name`/`typeId`/`implId` 同步设值无延迟
- **[Risk] 多 namespace Instance 创建后，数据操作（Get/Set/Delete/Keys）的行为变化 → Mitigation**: aerospike 的 `aerospikeAdapter.List` 当前返回不支持错误，多 namespace 的 keys/操作行为需在后续迭代中明确
- **[Trade-off] DataQueryPage 的 namespace 切换 UI 始终显示 Select → Mitigation**: namespace 选项仅在测试连接成功后加载，加载失败时降级为 Tag 展示

## Open Questions

- 多 namespace 下数据操作（Get/Set/Delete/Keys）的语义是什么？轮询所有 namespace？返回合并结果？当前 `aerospikeAdapter.List` 直接返回错误，需后续迭代处理
- 是否需要将 namespace 选项持久化到数据源配置中（即保存的 namespace 同时作为选项缓存）？
