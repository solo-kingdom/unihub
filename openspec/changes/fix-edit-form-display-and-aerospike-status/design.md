## Context

当前 `DatasourcePage` 的编辑弹窗使用 `destroyOnHidden` (Modal) + `preserve={false}` (Form) 配置。Modal 关闭时 Form DOM 被销毁，`preserve={false}` 导致表单 store 清空。编辑时 `handleOpenEdit` 在 `setModalOpen(true)` **之前**调用 `form.setFieldsValue` 设置名称/类型/实现字段，而 config 字段由 `useEffect` 在 Modal 打开**之后**设置。两个时机不一致导致上层字段（name/typeId/implId）丢失、config 字段有值的割裂现象。

`DataQueryPage` 目前对所有数据源类型一视同仁，仅展示名称和实现标识，缺少 Aerospike 特有的 namespace 信息和连接状态。

## Goals / Non-Goals

**Goals:**
- 编辑弹窗打开后，所有字段（名称、类型、实现 + 动态配置字段）完整回显已保存值
- 数据查询页选中 Aerospike 数据源后，展示 namespace 和连接状态
- `fetchTypes` 失败时有可见日志，方便排查

**Non-Goals:**
- 不修改后端 API（现有接口已满足需求）
- 不调整 Modal/Form 的 `destroyOnHidden` / `preserve` 行为策略（保持现有体验，仅修正时机）
- 不改变非 Aerospike 数据源在数据查询页的展示

## Decisions

### D1: 统一 `form.setFieldsValue` 到单个 `useEffect` 中

**选择**: 将 `handleOpenEdit` 中的 `form.setFieldsValue({name, typeId, implId})` 移除，和 config 字段的设置合并到同一个 `useEffect` 中，依赖 `[modalOpen, editingDs, currentImplMeta]`。

**原因**: Form 挂载前调 `setFieldsValue` 在 Ant Design 6 + `preserve={false}` 组合下不可靠。统一到 Form 挂载后的 effect 中确保所有字段在同一时机设置。

**备选方案**: 
- 移除 `preserve={false}` → 会改变非编辑状态的表单行为，引入其他副作用
- 使用 `initialValues` prop → 对动态配置字段不适用（字段数量不确定）
- 使用 `getContainer={false}` → 改变 Modal 渲染位置，可能影响样式

### D2: DataQueryPage 按 implId 差异化展示

**选择**: 当选中数据源 `implId === 'aerospike'` 时，在数据源选择器旁边展示：
- Namespace Tag: 从 `selectedDatasource.config.namespace` 读取
- 连接状态指示器: 调用 `datasourceApi.test(name)` 获取测试结果，显示绿色(成功)或红色(失败)状态

**原因**: 
- Namespace 已存储在 datasource config 中，无需额外 API 请求
- 连接测试 API (`POST /api/v1/datasources/{name}/test`) 已存在，返回 `{success, message}`
- 非 Aerospike 数据源不受影响，逻辑隔离

**备选方案**:
- 仅靠 Key 列表请求结果推断连接状态 → 不够精确（Key 列表可能为空）
- 单独创建新的"连接状态"组件 → 过度设计

### D3: fetchTypes 错误可见化

**选择**: 在 `fetchTypes` 的 catch 块中添加 `console.error('获取数据源类型失败:', err)`。

**原因**: 如果 `listTypes` API 静默失败，`types` 永久为空，编辑功能完全不可用且无任何提示。日志输出便于定位问题。

## Risks / Trade-offs

- **[Risk] Aerospike 连接测试失败（如网络不可达）→ Mitigation**: 连接测试失败时显示"连接失败"红色状态，不影响 Key 列表的正常浏览（Key 操作可能仍可用）
- **[Risk] useEffect 中 `currentImplMeta` 每帧都是新引用 → Mitigation**: 这是预期行为，确保 effect 在每次 Modal 打开时都触发。不会造成性能问题（仅 Modal 打开时触发一次核心逻辑）
- **[Trade-off] DataQueryPage 需要额外调用一次 `/test` API → Mitigation**: 连接测试通常很快（<5s 超时），且只在切换数据源时触发一次。可缓存结果避免重复请求

## Open Questions

- 是否需要缓存连接测试结果避免频繁请求？（当前设计是每次切换数据源都重新测试，后续可优化为仅首次测试）
