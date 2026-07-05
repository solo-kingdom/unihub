## ADDED Requirements

### Requirement: Aerospike 示例数据查询端点
系统 SHALL 提供 `GET /api/v1/datasources/{name}/aerospike/sample` 端点，通过 Aerospike ScanAll 操作采样指定数据源的数据，返回包含 key 和 value 的记录列表。

#### Scenario: 默认采样查询
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/sample`
- **THEN** 返回 200，响应体包含 `items` 数组（每项含 `key` 和 `value` 字段），默认限制 20 条，采样来自数据源配置的 namespace 和 set

#### Scenario: 指定 limit 参数
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/my-as/aerospike/sample?limit=10`
- **THEN** 返回 200，`items` 数组最多包含 10 条记录

#### Scenario: 数据源不存在
- **WHEN** 发送 GET 请求到 `/api/v1/datasources/nonexistent/aerospike/sample`
- **THEN** 返回 404 Not Found，提示数据源不存在

#### Scenario: 数据源不是 Aerospike 类型
- **WHEN** 对非 Aerospike 实现的数据源请求 sample 端点
- **THEN** 返回 400 Bad Request，提示该数据源不支持采样查询

#### Scenario: 空数据源采样
- **WHEN** 请求采样的 Aerospike set 中没有任何数据
- **THEN** 返回 200，`items` 为空数组

#### Scenario: Aerospike 节点不可达
- **WHEN** 数据源配置的 host/port 无法连接 Aerospike 服务器
- **THEN** 返回 502 Bad Gateway，提示连接失败

### Requirement: 前端 Aerospike 示例数据面板
系统 SHALL 在数据查询页面的 Aerospike 模式中，在查询栏下方展示示例数据列表，默认自动加载，用户可点击"换一批"刷新采样，点击某条数据在值详情面板展示完整内容。

#### Scenario: 自动加载示例数据
- **WHEN** 用户在数据查询页面选中一个 Aerospike 数据源
- **THEN** 自动调用 sample API（limit=20），在查询栏下方展示示例数据列表（每条显示 key 和截断的 value 预览）

#### Scenario: 点击示例数据查看详情
- **WHEN** 用户点击示例数据列表中的某一条记录
- **THEN** 值详情面板展示该记录的完整 key 和 value，同时 key 输入框同步显示该 key 名称

#### Scenario: 换一批刷新
- **WHEN** 用户点击"换一批"按钮
- **THEN** 重新调用 sample API 获取新的采样数据，刷新列表展示

#### Scenario: 采样结果为空
- **WHEN** sample API 返回空数组（数据源无数据）
- **THEN** 示例数据区域显示"暂无示例数据"的空状态提示

#### Scenario: 采样加载中
- **WHEN** sample API 请求进行中
- **THEN** 示例数据区域显示 loading 状态

#### Scenario: 采样请求失败
- **WHEN** sample API 请求失败（如连接不可达）
- **THEN** 示例数据区域显示错误提示，保留重新加载的能力

#### Scenario: 切换数据源时重置
- **WHEN** 用户切换到另一个数据源
- **THEN** 示例数据列表清空并重新加载（如果新数据源也是 Aerospike）
