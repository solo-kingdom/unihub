## ADDED Requirements

### Requirement: 测试连接触发 namespace 查询
系统 SHALL 在 DatasourcePage 的 Aerospike 数据源表单中，当用户点击「测试连接」并成功后，自动查询该 Aerospike 节点的可用 namespace 列表，并将列表存入组件状态以驱动 namespace 多选下拉框。

#### Scenario: 测试连接成功 → 自动查询 namespace
- **WHEN** 用户在 Aerospike 数据源表单中填写 host/port 后点击「测试连接」，且连接测试返回 success=true
- **THEN** 系统自动调用 `POST /api/v1/datasources/aerospike/namespaces` 查询可用 namespace，更新 `namespaceOptions` 状态

#### Scenario: namespace 字段渲染为多选下拉框
- **WHEN** `namespaceOptions` 状态中有可用 namespace 列表（查询成功）
- **THEN** namespace 字段渲染为 `<Select mode="multiple">`，选项为查询到的 namespace 列表，标签为 namespace 名称

#### Scenario: 保留已保存的 namespace 为选项
- **WHEN** 编辑模式下 namespace 字段已有保存值，且该值不在查询结果的 namespace 列表中
- **THEN** 系统将该已保存的 namespace 作为额外选项追加到下拉框中，标签注明「已保存」

#### Scenario: 测试连接失败不阻塞表单
- **WHEN** 测试连接失败（success=false）
- **THEN** 不触发 namespace 查询，namespace 字段保持为可手动输入的 Select（支持 `mode="tags"` 回退模式），用户可自由输入 namespace

#### Scenario: 切换实现时清空 namespace 状态
- **WHEN** 用户切换实现选择（如从 Aerospike 切换到 Redis）
- **THEN** 系统清空 `namespaceOptions` 和相关状态
