## ADDED Requirements

### Requirement: Aerospike 元信息查询端点
系统 SHALL 提供 `GET /api/v1/datasources/{name}/aerospike/meta` 端点，根据 query 参数 `info` 指定的元信息类型，连接数据源配置中的 Aerospike 节点并返回对应的元信息。

#### Scenario: 查询指定类型的元信息
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/meta?info=sets,statistics,build`
- **THEN** 返回 200，响应体包含 `sets`（各 namespace 下的 set 列表）、`statistics`（服务器统计键值对）、`build`（版本号字符串）

#### Scenario: 未指定 info 参数时返回默认信息
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/meta`（无 info 参数）
- **THEN** 返回 200，响应体包含 `namespaces`（命名空间列表）和 `sets`（各 namespace 的 set 列表）

#### Scenario: 数据源不存在
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/nonexistent/aerospike/meta`
- **THEN** 返回 404 Not Found，提示数据源不存在

#### Scenario: 数据源不是 Aerospike 类型
- **WHEN** 对非 Aerospike 实现的数据源（如 Redis）请求 meta 端点
- **THEN** 返回 400 Bad Request，提示该数据源不支持 meta 查询

#### Scenario: Aerospike 节点不可达
- **WHEN** 数据源配置的 host/port 无法连接 Aerospike 服务器
- **THEN** 返回 502 Bad Gateway，提示连接失败

### Requirement: 前端 Aerospike 元信息面板
系统 SHALL 在数据查询页面中，当选中 Aerospike 数据源时，提供可展开的元信息面板，展示集群的 namespace、set 列表、服务器统计、版本和节点信息。

#### Scenario: 展开元信息面板
- **WHEN** 用户在数据查询页选中 Aerospike 数据源，并点击展开元信息面板
- **THEN** 面板调用 meta API（默认 `info=sets,statistics`），显示 loading 状态，完成后展示：命名空间列表（标签形式）、各命名空间的 Set 列表、服务器统计（可折叠表格）、版本号和节点 ID

#### Scenario: 元信息查询失败
- **WHEN** meta API 调用失败（如服务器不可达）
- **THEN** 面板显示错误提示信息，并保留重新查询的能力

#### Scenario: 元信息面板折叠
- **WHEN** 用户再次点击面板标题或折叠按钮
- **THEN** 面板收起，隐藏详细 meta 信息，仅保留标题行

#### Scenario: 切换数据源时重置面板
- **WHEN** 用户切换到另一个数据源
- **THEN** 元信息面板重置为折叠状态，清除之前缓存的 meta 数据
