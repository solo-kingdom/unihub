## ADDED Requirements

### Requirement: 数据源类型查询 API
系统 SHALL 提供端点返回所有支持的数据源类型及其对应的实现列表。

#### Scenario: GET /api/v1/datasource-types - 查询类型与实现
- **WHEN** 发送 GET 请求到 `/api/v1/datasource-types`
- **THEN** 返回 200 和类型数组，每个类型包含 `id`、`name`、`interface` 字段，以及 `implementations` 数组（每个实现包含 `id`、`name`、`capabilities`、`configFields`）

## MODIFIED Requirements

### Requirement: API 路由框架
系统 SHALL 使用 `chi` 路由器构建 HTTP API，路由前缀为 `/api/v1/`，支持 CORS 跨域。

#### Scenario: API 路由注册
- **WHEN** 系统启动
- **THEN** 注册 `/api/v1/datasource-types`（类型查询）、`/api/v1/datasources` 相关路由（GET、POST、PUT、DELETE，支持查询参数过滤）和 `/api/v1/datasources/{name}/data` 数据操作路由

### Requirement: 数据源管理 API
系统 SHALL 提供完整的 RESTful API 用于数据源管理，数据源模型包含 `typeId` 和 `implId` 字段。

#### Scenario: GET /api/v1/datasources - 列出所有数据源（支持过滤）
- **WHEN** 发送 GET 请求到 `/api/v1/datasources`，可选携带 `typeId=kv` 或 `implId=redis` 查询参数
- **THEN** 返回 200 和过滤后的数据源列表 JSON 数组，每个数据源包含 `typeId` 和 `implId` 字段

#### Scenario: POST /api/v1/datasources - 创建数据源
- **WHEN** 发送 POST 请求到 `/api/v1/datasources`，body 包含 `name`、`typeId`、`implId` 和 `config`
- **THEN** 返回 201 和创建的数据源信息（含 `typeId`、`implId`）

#### Scenario: GET /api/v1/datasources/{name} - 获取单个数据源
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis`
- **THEN** 返回 200 和该数据源的详细信息（含 `typeId`、`implId`）

#### Scenario: PUT /api/v1/datasources/{name} - 更新数据源
- **WHEN** 发送 PUT 请求到 `/api/v1/datasources/my-redis`，body 包含更新后的 `config`（`typeId` 和 `implId` 不可更新）
- **THEN** 返回 200 和更新后的数据源信息

#### Scenario: DELETE /api/v1/datasources/{name} - 删除数据源
- **WHEN** 发送 DELETE 请求到 `/api/v1/datasources/my-redis`
- **THEN** 返回 204 No Content

#### Scenario: POST /api/v1/datasources/{name}/test - 测试连接
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/my-redis/test`
- **THEN** 返回 200 和连接测试结果（成功/失败及错误信息）

#### Scenario: POST /api/v1/datasources/test - 测试新连接
- **WHEN** 发送 POST 请求到 `/api/v1/datasources/test`，body 包含 `implId` 和 `config`
- **THEN** 返回 200 和连接测试结果
