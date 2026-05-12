## ADDED Requirements

### Requirement: 数据查询页 Aerospike 状态展示
系统 SHALL 在数据查询页面选中 `implId` 为 `aerospike` 的数据源后，在数据源选择器旁边自动展示该数据源的 namespace 名称和连接测试状态。

#### Scenario: 选中 Aerospike 数据源后展示 namespace
- **WHEN** 用户在数据查询页面的数据源下拉框中选中一个 `implId` 为 `aerospike` 的数据源
- **THEN** 系统从该数据源的 `config.namespace` 中读取 namespace 值，并在选择器旁边以 Tag 形式展示（如 `ns: test`）

#### Scenario: 选中 Aerospike 数据源后展示连接状态
- **WHEN** 用户选中一个 Aerospike 数据源
- **THEN** 系统自动调用 `POST /api/v1/datasources/{name}/test` 连接测试接口，并根据返回结果显示连接状态——成功时显示绿色"已连接"标识，失败时显示红色"连接失败"标识及错误信息

#### Scenario: 选中非 Aerospike 数据源
- **WHEN** 用户选中的数据源 `implId` 不是 `aerospike`
- **THEN** 不展示 namespace Tag 和连接状态指示器，保持原有展示方式

#### Scenario: 数据源配置中无 namespace
- **WHEN** 选中的 Aerospike 数据源的 `config.namespace` 为空
- **THEN** namespace Tag 显示为 `ns: (未设置)`

#### Scenario: 连接测试进行中
- **WHEN** 系统正在执行连接测试（网络请求中）
- **THEN** 连接状态指示器显示 loading 状态（如 Spin 图标 + "测试中..."）
