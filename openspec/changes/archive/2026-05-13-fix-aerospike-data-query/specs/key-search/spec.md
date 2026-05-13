## MODIFIED Requirements

### Requirement: 前端 Key 搜索 UI
系统 SHALL 在数据查询页面的 key 列表面板顶部提供搜索输入框，支持用户输入 glob 模式实时过滤 key 列表。对于 implId 为 `aerospike` 的数据源，系统 SHALL 不显示键列表面板和搜索输入框。

#### Scenario: 输入搜索模式过滤 key 列表
- **WHEN** 用户在非 Aerospike 数据源的 key 搜索输入框中输入 `user:`（带防抖 300ms）
- **THEN** key 列表仅显示名称以 `user:` 开头的 key，列表标题更新为匹配后的 key 数量

#### Scenario: 清除搜索恢复全部 key 列表
- **WHEN** 用户点击搜索输入框的清除按钮或清空输入内容
- **THEN** key 列表恢复显示该数据源的全部 key

#### Scenario: 切换数据源时清空搜索
- **WHEN** 用户切换到不同的数据源
- **THEN** 搜索输入框内容清空，显示新数据源的全部 key 列表

#### Scenario: Aerospike 数据源隐藏搜索 UI
- **WHEN** 用户选中一个 implId 为 `aerospike` 的数据源
- **THEN** 键列表面板和搜索输入框不显示
