## ADDED Requirements

### Requirement: Aerospike 数据源列表展示 namespace 和 set
数据源列表查询 SHALL 在返回结果中对 Aerospike 实现的数据源额外展示其配置的 namespace 和 set 值。前端列表表格 SHALL 包含「命名空间」和「Set」两个常驻列，Aerospike 数据源显示对应配置值，非 Aerospike 数据源显示 `-`。

#### Scenario: 列表展示 Aerospike namespace 和 set
- **WHEN** 请求获取数据源列表，列表中包含 Aerospike 实现的数据源
- **THEN** 该数据源行的「命名空间」列显示 `config.namespace` 值（如 `test,prod`），「Set」列显示 `config.set` 值（如 `users`，未配置时显示 `-`）

#### Scenario: 非 Aerospike 数据源不展示 namespace 和 set
- **WHEN** 请求获取数据源列表，列表中包含 Redis 或 BoltDB 实现的数据源
- **THEN** 该数据源行的「命名空间」和「Set」列均显示 `-`

### Requirement: 测试连接成功后自动选中 namespace
系统 SHALL 在 Aerospike 数据源表单中，当测试连接成功并查询到可用 namespace 列表后，自动将所有查询到的 namespace 选中填入 namespace 多选字段。

#### Scenario: 测试连接成功后自动全选 namespace
- **WHEN** 用户在 Aerospike 数据源表单中填写 host/port 并点击「测试连接」，连接成功且返回 namespace 列表 `["test", "prod", "staging"]`
- **THEN** namespace 多选下拉框中 `test`、`prod`、`staging` 三项均自动选中，表单字段 `config_namespace` 值为 `["test", "prod", "staging"]`

#### Scenario: 测试连接成功但用户已有手动选择
- **WHEN** 用户已在 namespace 字段中手动选择了部分 namespace，然后点击「测试连接」并成功
- **THEN** 自动全选覆盖手动选择（以测试连接返回的完整列表为准）

#### Scenario: 测试连接成功但无可用 namespace
- **WHEN** 测试连接成功但未返回任何 namespace
- **THEN** namespace 字段保持当前状态不变（可能是空或之前的手动输入），不自动修改
