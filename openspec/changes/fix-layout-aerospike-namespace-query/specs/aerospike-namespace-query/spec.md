## ADDED Requirements

### Requirement: 后端命名空间查询端点
系统 SHALL 提供 `POST /api/v1/datasources/aerospike/namespaces` 端点，接受主机地址和端口，返回该 Aerospike 节点上的可用命名空间列表。

#### Scenario: 成功查询命名空间
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/aerospike/namespaces`，body 为 `{ "host": "localhost", "port": 3000 }`
- **THEN** 返回 200 和 `{ "namespaces": ["test", "ns1", "bar"] }` 格式的命名空间列表

#### Scenario: Aerospike 服务器不可达
- **WHEN** 主机地址或端口无法连接 Aerospike 服务器
- **THEN** 返回 502 Bad Gateway，响应体包含 `{ "error": "connection_failed", "message": "无法连接到 Aerospike 服务器: ..." }`

#### Scenario: 命名空间查询返回空
- **WHEN** Aerospike 服务器上无任何命名空间（极端情况）
- **THEN** 返回 200 和 `{ "namespaces": [] }` 空数组

#### Scenario: 缺少必填参数
- **WHEN** 请求 body 缺少 `host` 或 `port` 字段
- **THEN** 返回 400 Bad Request，提示必填参数缺失

### Requirement: 前端命名空间自动查询
系统 SHALL 在创建 Aerospike 数据源表单中，当用户在表单中填写了主机地址和端口后，自动查询该 Aerospike 节点的可用命名空间，并将命名空间字段从纯文本输入框切换为下拉选择器，以下拉选项供用户选择。

#### Scenario: 主机和端口填写完整后自动查询
- **WHEN** 用户在 Aerospike 数据源表单中填写了主机地址（如 `192.168.1.1`）和端口（如 `3000`），且两个字段值均不为空
- **THEN** 命名空间字段切换为 Select 下拉框，触发自动查询（防抖 500ms），Select 框显示 loading spinner，查询完成后下拉框显示可用命名空间列表

#### Scenario: 自动查询失败降级
- **WHEN** 自动查询失败（如服务器不可达、返回错误）
- **THEN** Select 框保持为可手动输入的文本模式，允许用户自行输入命名空间名称，并在字段下方显示错误提示信息

#### Scenario: 主机或端口字段变化时重新查询
- **WHEN** 用户修改主机地址或端口号
- **THEN** 清除已有命名空间列表，若主机和端口仍均有值则重新触发查询

#### Scenario: 主机或端口未填写完成
- **WHEN** 主机或端口任一为空
- **THEN** 命名空间字段保持为普通文本输入框，不触发查询，不使用 Select 下拉模式

#### Scenario: 用户在编辑模式下查询
- **WHEN** 编辑已有 Aerospike 数据源时，命名空间字段已有保存的值
- **THEN** 如果主机和端口有值，仍触发自动查询并将已保存的值预选在 Select 中；如果已保存的命名空间不在查询结果中，仍保留该值作为 Select 中的有效选项

### Requirement: 命名为 aerospike/namespaces 的路由注册顺序
系统 SHALL 在 chi 路由器中将 `POST /api/v1/datasources/aerospike/namespaces` 路由注册在 `POST /api/v1/datasources/{name}` 通配路由之前，避免 `aerospike` 被匹配为路径参数 `{name}`。

#### Scenario: 路由匹配顺序
- **WHEN** 系统启动并注册所有路由
- **THEN** `POST /api/v1/datasources/aerospike/namespaces` 路由在 `/datasources/{name}` 之前注册，确保该请求被正确的 handler 处理
