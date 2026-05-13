## MODIFIED Requirements

### Requirement: 前端随机 Key 获取 UI
系统 SHALL 在数据查询页面的 key 列表面板头部提供「随机」按钮，点击后获取随机 key 并自动选中查看其值。对于 implId 为 `aerospike` 的数据源，系统 SHALL 不显示随机按钮。

#### Scenario: 点击随机按钮获取随机 key
- **WHEN** 用户在非 Aerospike 数据源的 key 列表面板点击「随机」按钮
- **THEN** 系统调用随机 key API，获取随机 key 名称后自动在 key 列表中选中该 key 并显示其值

#### Scenario: 数据源无 key 时点击随机按钮
- **WHEN** 用户点击「随机」按钮但当前数据源没有任何 key
- **THEN** 显示友好提示信息「当前数据源无可用数据」

#### Scenario: Aerospike 数据源隐藏随机按钮
- **WHEN** 用户选中一个 implId 为 `aerospike` 的数据源
- **THEN** 随机按钮不显示
