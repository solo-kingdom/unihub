## ADDED Requirements

### Requirement: API 路由框架
系统 SHALL 使用 `chi` 路由器构建 HTTP API，路由前缀为 `/api/v1/`，支持 CORS 跨域。

#### Scenario: API 路由注册
- **WHEN** 系统启动
- **THEN** 注册 `/api/v1/datasource-types`（类型查询）、`/api/v1/datasources` 相关路由（GET、POST、PUT、DELETE，支持查询参数过滤）和 `/api/v1/datasources/{name}/data` 数据操作路由

### Requirement: 数据源类型查询 API
系统 SHALL 提供端点返回所有支持的数据源类型及其对应的实现列表。

#### Scenario: GET /api/v1/datasource-types - 查询类型与实现
- **WHEN** 发送 GET 请求到 `/api/v1/datasource-types`
- **THEN** 返回 200 和类型数组，每个类型包含 `id`、`name`、`interface` 字段，以及 `implementations` 数组（每个实现包含 `id`、`name`、`capabilities`、`configFields`）

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

### Requirement: 数据操作 API
系统 SHALL 提供统一的数据读写 API，通过数据源名称路由到对应的后端存储。

#### Scenario: GET /api/v1/datasources/{name}/data?key=xxx - 读取数据
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/data?key=mykey`
- **THEN** 返回 200 和该键对应的值

#### Scenario: PUT /api/v1/datasources/{name}/data - 写入数据
- **WHEN** 发送 PUT 请求，body 包含 `{ "key": "mykey", "value": "myvalue" }`
- **THEN** 返回 200 写入成功

#### Scenario: DELETE /api/v1/datasources/{name}/data?key=xxx - 删除数据
- **WHEN** 发送 DELETE 请求到 `/api/v1/datasources/my-redis/data?key=mykey`
- **THEN** 返回 204 No Content

#### Scenario: GET /api/v1/datasources/{name}/keys - 列出键
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/keys`
- **THEN** 返回 200 和该数据源中的键列表

#### Scenario: 操作不存在数据源
- **WHEN** 对不存在的数据源执行数据操作
- **THEN** 返回 404 Not Found 错误

### Requirement: 统一错误响应格式
系统 SHALL 对所有 API 错误返回统一的 JSON 格式：`{ "error": "错误类型", "message": "详细描述" }`。

#### Scenario: 错误响应格式
- **WHEN** API 请求发生任何错误
- **THEN** 响应体为 JSON，包含 `error` 和 `message` 字段，HTTP 状态码对应错误类型（400/404/409/500）

### Requirement: 请求日志中间件
系统 SHALL 对每个 API 请求记录请求方法、路径、状态码和耗时。

#### Scenario: 请求日志记录
- **WHEN** 处理任意 API 请求
- **THEN** 在日志中输出 `[方法] [路径] [状态码] [耗时]` 格式的日志行
