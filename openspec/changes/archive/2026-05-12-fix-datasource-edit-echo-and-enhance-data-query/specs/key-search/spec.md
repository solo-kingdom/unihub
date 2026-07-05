## ADDED Requirements

### Requirement: Key 模式搜索 API
系统 SHALL 支持通过 glob 风格的模式字符串搜索数据源中的 key。`GET /api/v1/datasources/{name}/keys` 端点接受可选的 `pattern` 查询参数，返回匹配该模式的所有 key。

#### Scenario: 按前缀搜索 key
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys?pattern=user:*` 请求
- **THEN** 返回 200 和匹配前缀 `user:` 的 key 列表（如 `user:1`、`user:admin`），不包含不匹配的 key（如 `order:1`）

#### Scenario: 按后缀搜索 key
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys?pattern=*:config` 请求
- **THEN** 返回 200 和以后缀 `:config` 结尾的 key 列表

#### Scenario: 精确搜索（无通配符）
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys?pattern=mykey` 请求
- **THEN** 返回 200，若存在名为 `mykey` 的 key 则返回包含该项的列表，否则返回空列表

#### Scenario: 不传 pattern 参数
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys` 请求（无 pattern 参数）
- **THEN** 返回 200 和该数据源中全部 key 列表（行为不变）

#### Scenario: pattern 参数为空字符串
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys?pattern=` 请求
- **THEN** 返回 200 和该数据源中全部 key 列表（等同于不传 pattern）

#### Scenario: 搜索不存在的 key 模式
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys?pattern=nonexistent:*` 请求
- **THEN** 返回 200 和空的 key 列表 `{ "keys": [] }`

### Requirement: 前端 Key 搜索 UI
系统 SHALL 在数据查询页面的 key 列表面板顶部提供搜索输入框，支持用户输入 glob 模式实时过滤 key 列表。

#### Scenario: 输入搜索模式过滤 key 列表
- **WHEN** 用户在 key 搜索输入框中输入 `user:`（带防抖 300ms）
- **THEN** key 列表仅显示名称以 `user:` 开头的 key，列表标题更新为匹配后的 key 数量

#### Scenario: 清除搜索恢复全部 key 列表
- **WHEN** 用户点击搜索输入框的清除按钮或清空输入内容
- **THEN** key 列表恢复显示该数据源的全部 key

#### Scenario: 切换数据源时清空搜索
- **WHEN** 用户切换到不同的数据源
- **THEN** 搜索输入框内容清空，显示新数据源的全部 key 列表
