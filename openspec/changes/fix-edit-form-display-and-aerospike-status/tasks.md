## 1. 重写编辑弹窗（DatasourcePage）

- [x] 1.1 移除 `destroyOnHidden` 使 Form 始终挂载，避免 `preserve={false}` + DOM 销毁导致 `setFieldsValue` 失效
- [x] 1.2 添加 `findImplMeta` 辅助函数直接从 `types` 查找实现元数据，不再依赖 state 驱动的 `currentImplMeta`
- [x] 1.3 重写 `handleOpenEdit`：`form.resetFields()` 后同步设置所有字段（name/typeId/implId + 所有 config），再打开 Modal
- [x] 1.4 移除所有 namespace 自动查询逻辑（`namespaceOptions`、`namespaceLoading`、`watchedHost/Port`、`clearNamespaceState`、相关 `useEffect`）
- [x] 1.5 namespace 字段恢复为普通 Input（不再使用 Select 自动查询）

## 2. 测试时加载 Aerospike namespace（DatasourcePage）

- [x] 2.1 `handleTest` 中对 Aerospike 连接测试成功后，额外调用 `queryAerospikeNamespaces` 并追加可用 namespace 信息到测试结果

## 3. 数据查询页 Aerospike 自动查询 namespace（DataQueryPage）

- [x] 3.1 选中 Aerospike 数据源后，通过 `config.host/port` 自动查询可用命名空间（防抖 300ms）
- [x] 3.2 查询结果渲染为 Select 下拉框供查看，保留已保存的 namespace 作为选项
- [x] 3.3 无查询结果时降级为 Tag 展示 `ns: <namespace>`
- [x] 3.4 保持连接状态展示（已连接/连接失败/测试中）

## 4. 增强错误处理

- [x] 4.1 `fetchTypes` catch 块添加 `console.error`

## 5. 验证

- [ ] 5.1 手动验证：编辑 Redis/BoltDB/Aerospike 数据源，确认所有字段正确回显
- [ ] 5.2 手动验证：新增数据源功能正常
- [ ] 5.3 手动验证：数据查询页选中 Aerospike 后 namespace 下拉框自动加载、连接状态展示
- [ ] 5.4 手动验证：数据源管理中测试 Aerospike 连接时显示可用 namespace
