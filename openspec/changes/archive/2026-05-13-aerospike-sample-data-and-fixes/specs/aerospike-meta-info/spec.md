## MODIFIED Requirements

### Requirement: Aerospike 元信息查询端点
系统 SHALL 提供 `GET /api/v1/datasources/{name}/aerospike/meta` 端点，根据 query 参数 `info` 指定的元信息类型，连接数据源配置中的 Aerospike 节点并返回对应的元信息。所有列表类型字段（sets、namespaces）MUST 返回空数组 `[]` 而非 `null`。

#### Scenario: 查询指定类型的元信息
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/meta?info=sets,statistics,build`
- **THEN** 返回 200，响应体包含 `sets`（各 namespace 下的 set 列表，空 namespace 返回 `[]`）、`statistics`（服务器统计键值对）、`build`（版本号字符串）

#### Scenario: namespace 下没有 set 时返回空数组
- **WHEN** 请求的某个 namespace 下没有任何 set
- **THEN** `sets` 中该 namespace 对应的值为空数组 `[]`，而非 `null`

#### Scenario: 未指定 info 参数时返回默认信息
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/meta`（无 info 参数）
- **THEN** 返回 200，响应体包含 `namespaces`（命名空间列表，无命名空间时返回 `[]`）和 `sets`（各 namespace 的 set 列表）

#### Scenario: 数据源不存在
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/nonexistent/aerospike/meta`
- **THEN** 返回 404 Not Found，提示数据源不存在

#### Scenario: 数据源不是 Aerospike 类型
- **WHEN** 对非 Aerospike 实现的数据源（如 Redis）请求 meta 端点
- **THEN** 返回 400 Bad Request，提示该数据源不支持 meta 查询

#### Scenario: Aerospike 节点不可达
- **WHEN** 数据源配置的 host/port 无法连接 Aerospike 服务器
- **THEN** 返回 502 Bad Gateway，提示连接失败
