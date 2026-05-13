## 1. 修复编辑弹窗回显（DatasourcePage.tsx）

- [x] 1.1 移除 `<Form preserve={false}>` 改为默认 `preserve={true}`
- [x] 1.2 `handleOpenEdit` 中仅同步设置 `name`/`typeId`/`implId` 三个始终在 DOM 中的字段，移除 config 字段的同步设置
- [x] 1.3 新增 `useEffect`（依赖 `[modalOpen, editingDs, currentImplMeta]`），在其中通过 `form.setFieldsValue` 设置所有 `config_*` 字段值
- [x] 1.4 清理不再需要的 namespace 自动查询逻辑（`namespaceOptions`、`namespaceLoading`、防抖 ref、`Form.useWatch` 等残留状态）
- [x] 1.5 `handleOpenCreate` 中新增清空 namespace 相关状态的逻辑

## 2. 测试连接触发 namespace 查询（DatasourcePage.tsx）

- [x] 2.1 `handleTest` 中 success 分支保留现有 namespace 查询逻辑，但将结果存入组件状态 `namespaceOptions`（类型改为 `{ value: string; label: string }[]`）
- [x] 2.2 namespace Form.Item 渲染逻辑：有 `namespaceOptions` 时渲染 `<Select mode="multiple">`，无 options 时渲染 `<Select mode="tags">`（允许手动输入）
- [x] 2.3 编辑模式下，将已保存的 namespace（逗号分隔）作为预选项；不在查询结果中的值追加标记「已保存」
- [x] 2.4 切换实现时（`implId` onChange）清空 `namespaceOptions`、`namespaceLoading` 状态

## 3. 多 namespace 后端支持（internal/store/registry.go）

- [x] 3.1 `createAerospikeStorage` 中解析 `config["namespace"]` 为逗号分隔列表（trim 空格、过滤空段）
- [x] 3.2 为每个 namespace 创建独立的 `aerospike.Instance`（ID 格式 `"ns-{index}"`，共享 host/port/set 配置）
- [x] 3.3 向后兼容：单值 namespace 视为列表中的一项，行为不变

## 4. 数据查询页 namespace 切换（DataQueryPage.tsx）

- [x] 4.1 新增 `activeNamespace` 状态，初始值为 datasource config 中保存的 namespace（取第一个或全部）
- [x] 4.2 namespace Select 绑定 `value={activeNamespace}`，添加 `onChange` handler 更新状态并重新获取 keys
- [x] 4.3 保持现有连接状态展示、namespace 自动查询和降级 Tag 逻辑不变

## 5. 验证

- [ ] 5.1 手动验证：编辑 Redis/BoltDB/Aerospike 数据源，确认所有字段（名称、类型、实现、config）正确回显已保存值
- [ ] 5.2 手动验证：新增 Aerospike 数据源 → 测试连接成功后 namespace 下拉框显示多选选项 → 选择多个 → 保存 → 编辑回显多值
- [ ] 5.3 手动验证：数据查询页选中 Aerospike → namespace 下拉框切换 → keys 重新加载
- [ ] 5.4 手动验证：编辑已有单 namespace 的旧数据源，正常回显且兼容多值逻辑
