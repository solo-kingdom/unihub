## ADDED Requirements

### Requirement: 随机 Key 获取 API
系统 SHALL 提供端点从指定数据源中随机获取一个 key 名称。`GET /api/v1/datasources/{name}/keys/random` 返回一个随机选取的 key。

#### Scenario: 成功获取随机 key
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys/random` 请求，且数据源中至少有一个 key
- **THEN** 返回 200 和包含随机 key 名称的 JSON `{ "key": "<random-key-name>" }`

#### Scenario: 数据源无 key 时随机获取
- **WHEN** 发送 `GET /api/v1/datasources/my-redis/keys/random` 请求，但数据源中没有任何 key
- **THEN** 返回 404，错误信息提示数据源中无可用 key

#### Scenario: 数据源不存在时随机获取
- **WHEN** 发送 `GET /api/v1/datasources/nonexistent/keys/random` 请求
- **THEN** 返回 404 Not Found 错误

### Requirement: 前端随机 Key 获取 UI
系统 SHALL 在数据查询页面的 key 列表面板头部提供「随机」按钮，点击后获取随机 key 并自动选中查看其值。

#### Scenario: 点击随机按钮获取随机 key
- **WHEN** 用户点击 key 列表面板头部的「随机」按钮
- **THEN** 系统调用随机 key API，获取随机 key 名称后自动在 key 列表中选中该 key 并显示其值

#### Scenario: 数据源无 key 时点击随机按钮
- **WHEN** 用户点击「随机」按钮但当前数据源没有任何 key
- **THEN** 显示友好提示信息「当前数据源无可用数据」
