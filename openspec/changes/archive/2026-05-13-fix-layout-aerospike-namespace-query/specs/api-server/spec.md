## ADDED Requirements

### Requirement: Aerospike 命名空间查询 API
系统 SHALL 提供 POST 端点用于查询指定 Aerospike 节点的可用命名空间列表。

#### Scenario: POST /api/v1/datasources/aerospike/namespaces - 查询命名空间
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/aerospike/namespaces`，body 包含 `{ "host": "localhost", "port": 3000 }`
- **THEN** 返回 200 和 `{ "namespaces": ["namespace1", "namespace2"] }`

#### Scenario: POST /api/v1/datasources/aerospike/namespaces - 连接失败
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/aerospike/namespaces`，但 Aerospike 服务器不可达
- **THEN** 返回 502 和统一错误格式 `{ "error": "connection_failed", "message": "..." }`

#### Scenario: POST /api/v1/datasources/aerospike/namespaces - 缺少参数
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/aerospike/namespaces`，body 缺少 `host` 或 `port`
- **THEN** 返回 400 和统一错误格式 `{ "error": "bad_request", "message": "..." }`
