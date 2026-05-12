## MODIFIED Requirements

### Requirement: 数据操作 API
系统 SHALL 提供统一的数据读写 API，通过数据源名称路由到对应的后端存储。支持按 key 读写删除、列出所有 key、按模式搜索 key、随机获取 key 以及检查 key 是否存在的操作。

#### Scenario: GET /api/v1/datasources/{name}/data?key=xxx - 读取数据
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/data?key=mykey`
- **THEN** 返回 200 和该键对应的值

#### Scenario: HEAD /api/v1/datasources/{name}/data?key=xxx - 检查 key 是否存在
- **WHEN** 发送 HEAD 请求到 `/api/v1/datasources/my-redis/data?key=mykey`，且 key 存在
- **THEN** 返回 200（无响应体）
- **AND** 若 key 不存在则返回 404

#### Scenario: PUT /api/v1/datasources/{name}/data - 写入数据
- **WHEN** 发送 PUT 请求，body 包含 `{ "key": "mykey", "value": "myvalue" }`
- **THEN** 返回 200 写入成功

#### Scenario: DELETE /api/v1/datasources/{name}/data?key=xxx - 删除数据
- **WHEN** 发送 DELETE 请求到 `/api/v1/datasources/my-redis/data?key=mykey`
- **THEN** 返回 204 No Content

#### Scenario: GET /api/v1/datasources/{name}/keys - 列出全部键
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/keys`（无 pattern 参数）
- **THEN** 返回 200 和该数据源中的全部键列表

#### Scenario: GET /api/v1/datasources/{name}/keys?pattern=xxx - 按模式搜索键
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/keys?pattern=user:*`
- **THEN** 返回 200 和匹配 glob 模式 `user:*` 的键列表

## ADDED Requirements

### Requirement: 随机 Key 获取 API
系统 SHALL 提供端点从数据源中随机获取一个 key。

#### Scenario: GET /api/v1/datasources/{name}/keys/random - 获取随机 key
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-redis/keys/random`
- **THEN** 返回 200 和 `{ "key": "<random-key-name>" }`；若数据源无任何 key 则返回 404

### Requirement: Key 存在性检查 API
系统 SHALL 提供轻量端点检查指定 key 是否存在于数据源中。

#### Scenario: HEAD /api/v1/datasources/{name}/data?key=xxx - key 存在
- **WHEN** 发送 HEAD 请求到 `/api/v1/datasources/my-redis/data?key=existing-key`
- **THEN** 返回 200（无响应体）

#### Scenario: HEAD /api/v1/datasources/{name}/data?key=xxx - key 不存在
- **WHEN** 发送 HEAD 请求到 `/api/v1/datasources/my-redis/data?key=nonexistent`
- **THEN** 返回 404

#### Scenario: HEAD /api/v1/datasources/{name}/data 缺少 key 参数
- **WHEN** 发送 HEAD 请求到 `/api/v1/datasources/my-redis/data` 不带 `key` 查询参数
- **THEN** 返回 400 Bad Request
