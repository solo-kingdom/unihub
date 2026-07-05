## MODIFIED Requirements

### Requirement: 前端命名空间自动查询
系统 SHALL 在数据查询页面（DataQueryPage）选中 Aerospike 数据源后，自动查询该数据源配置中 host/port 对应的可用 namespace 列表，并在 namespace 下拉框中展示。用户可切换 namespace，切换后重新查询 keys 列表。连接状态指示器展示当前数据源的连接测试结果。

#### Scenario: 选中 Aerospike 数据源后自动查询 namespace 并显示连接状态
- **WHEN** 用户在数据查询页面下拉框中选中一个 Aerospike 数据源
- **THEN** 系统自动测试连接（显示状态：连接中 → 已连接/连接失败），并查询可用 namespace 列表（防抖 300ms），namespace 显示为下拉选择框
- **AND** 连接状态以 Tag 展示（绿色「已连接」或红色「连接失败」）

#### Scenario: 用户切换 namespace
- **WHEN** 用户在 namespace 下拉框中选择不同的 namespace（与当前选中的不同）
- **THEN** 系统更新本地 `activeNamespace` 状态，并重新查询该 namespace 的 keys 列表

#### Scenario: namespace 选项加载中
- **WHEN** namespace 查询正在进行中（防抖计时中或请求未返回）
- **THEN** Select 显示 loading 状态，value 保持为 datasource config 中保存的 namespace

#### Scenario: namespace 查询失败
- **WHEN** namespace 查询失败（如网络错误或服务器不可达）
- **THEN** namespace 以 Tag 形式显示保存的值（只读），不渲染 Select 下拉框

#### Scenario: 切换到非 Aerospike 数据源
- **WHEN** 用户从 Aerospike 数据源切换到其他类型的数据源（如 Redis）
- **THEN** namespace 选择器和连接状态指示器均不再显示
