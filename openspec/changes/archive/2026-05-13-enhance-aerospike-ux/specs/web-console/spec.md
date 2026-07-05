## ADDED Requirements

### Requirement: Aerospike 连接失败重试
系统 SHALL 在数据查询页面中，当选中 Aerospike 数据源后连接测试失败时，在「连接失败」状态 Tag 旁提供「重试」按钮，用户点击后重新发起连接测试并更新状态。

#### Scenario: 显示重试按钮
- **WHEN** 选中 Aerospike 数据源且连接测试返回失败状态
- **THEN** 「连接失败」红色 Tag 右侧显示「🔄 重试」按钮

#### Scenario: 点击重试成功
- **WHEN** 用户点击「重试」按钮，且本次连接测试成功
- **THEN** 连接状态 Tag 更新为绿色「已连接」，重试按钮消失

#### Scenario: 点击重试仍失败
- **WHEN** 用户点击「重试」按钮，且连接测试仍然失败
- **THEN** 连接状态 Tag 保持红色「连接失败」，重试按钮继续可见待下次重试

#### Scenario: 连接成功时不显示重试按钮
- **WHEN** 选中 Aerospike 数据源且连接测试成功
- **THEN** 仅显示绿色「已连接」Tag，不显示重试按钮

### Requirement: 新增键值 Modal 展示 namespace 和 set 上下文
系统 SHALL 在数据查询页面的「新增键值」Modal 中，对 Aerospike 数据源在表单顶部显示当前写入目标 namespace 和 set 信息。

#### Scenario: Aerospike 数据源新增时显示 namespace 和 set
- **WHEN** 在数据查询页选中 Aerospike 数据源（namespace="test,prod"，set="users"）并打开「新增键值」Modal
- **THEN** Modal 表单顶部显示一行上下文指示：namespace 显示当前 `activeNamespace` 值（如 `test`），set 显示配置的 set 值（如 `users`，未配置时显示「默认」）

#### Scenario: 非 Aerospike 数据源不显示上下文
- **WHEN** 在数据查询页选中 Redis 或 BoltDB 数据源并打开「新增键值」Modal
- **THEN** Modal 不显示 namespace/set 上下文行，仅显示键名和值输入框

#### Scenario: 编辑模式同样适用
- **WHEN** 在数据查询页编辑已有键值，打开编辑 Modal
- **THEN** 编辑 Modal 对 Aerospike 数据源同样显示 namespace/set 上下文信息（但 set 不可编辑）
