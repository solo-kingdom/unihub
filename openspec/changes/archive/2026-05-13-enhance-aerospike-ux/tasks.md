## 1. 后端：Aerospike 元信息查询端点

- [x] 1.1 在 `internal/service/datasource.go` 新增 `QueryAerospikeMeta(name string, infoTypes []string)` 方法：读取 datasource config 获取 host/port，连接 Aerospike 节点，按 infoTypes 逐项执行 `RequestInfo` 命令（`namespaces`、`sets/<ns>`、`statistics`、`build`、`node`、`cluster-name`），返回结构化 `map[string]interface{}`
- [x] 1.2 在 `internal/handler/datasource.go` 新增 `HandleAerospikeMeta` handler：解析 `{name}` 路径参数和 `?info=` query 参数，调用 service 方法，返回 JSON 响应；校验 implId 为 aerospike，否则 400
- [x] 1.3 在 `main.go` 注册路由 `GET /api/v1/datasources/{name}/aerospike/meta`（在 `/{name}` 通配路由之前）

## 2. 前端：数据源列表表格增加 namespace/set 列

- [x] 2.1 在 `DatasourcePage.tsx` 的 `columns` 数组中新增「命名空间」列：`dataIndex` 从 `config.namespace` 读取，`implId === 'aerospike'` 时显示值，否则显示 `-`
- [x] 2.2 新增「Set」列：`dataIndex` 从 `config.set` 读取，`implId === 'aerospike'` 且 `config.set` 非空时显示值，否则显示 `-`；列设置 `ellipsis: true`、宽度 100px

## 3. 前端：测试连接成功后自动选中 namespace

- [x] 3.1 在 `DatasourcePage.tsx` 的 `handleTest` 中，Aerospike 连接成功且 namespace 查询有结果时，调用 `form.setFieldValue('config_namespace', nss)` 自动全选所有可用 namespace

## 4. 前端：数据查询页连接失败重试按钮

- [x] 4.1 提取 `handleRetryConnection` 函数：封装 `datasourceApi.test(selectedDs)` 调用逻辑（loading 状态 + connectionStatus 更新 + 错误处理）
- [x] 4.2 在连接状态 Tag 区域，当 `connectionStatus && !connectionStatus.success` 时渲染「重试」按钮（`Button size="small" icon={<ReloadOutlined />}`），`onClick` 调用 `handleRetryConnection`
- [x] 4.3 `handleSelectDs` 中复用 `handleRetryConnection` 避免重复代码

## 5. 前端：数据查询页 Aerospike 元信息面板

- [x] 5.1 在 `api/index.ts` 新增 `dataApi.queryAerospikeMeta(dsName, info?)` 方法，调用 `GET /datasources/${dsName}/aerospike/meta?info=...`
- [x] 5.2 在 `DataQueryPage.tsx` 新增 `metaData` state 和 `metaLoading` state
- [x] 5.3 实现可折叠元信息面板组件：点击「📊 元信息」按钮展开，调用 meta API，展示 namespace 列表、set 列表（按 namespace 分组）、统计数据表格（可折叠）、版本号和节点 ID 标签
- [x] 5.4 切换数据源时自动重置面板为折叠状态并清除缓存数据
- [x] 5.5 面板仅对 `implId === 'aerospike'` 的数据源可见

## 6. 前端：新增/编辑键值 Modal 展示 namespace/set 上下文

- [x] 6.1 在 `DataQueryPage.tsx` 的「新增键值」Modal 表单顶部，当 `selectedDatasource?.implId === 'aerospike'` 时增加上下文指示行：显示 namespace（来自 `activeNamespace`）和 set（来自 `selectedDatasource.config.set`，未配置时显示「默认」），使用 `Tag` 或 `Descriptions` 组件
- [x] 6.2 在「编辑键值」Modal 表单顶部同样添加 namespace/set 上下文指示

## 7. 验证

- [ ] 7.1 手动验证：数据源列表中 Aerospike 数据源显示 namespace 和 set 列，非 Aerospike 显示 `-`
- [ ] 7.2 手动验证：新增 Aerospike 数据源，测试连接成功后 namespace 多选字段自动全选
- [ ] 7.3 手动验证：数据查询页选中 Aerospike，连接失败时显示重试按钮，点击重试成功/失败均正确更新状态
- [ ] 7.4 手动验证：元信息面板展开后正确显示 namespace、set、统计、版本等信息
- [ ] 7.5 手动验证：「新增键值」和「编辑键值」Modal 中 Aerospike 数据源显示 namespace/set 上下文
