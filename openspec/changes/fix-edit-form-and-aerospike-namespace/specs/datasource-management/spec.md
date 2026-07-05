## MODIFIED Requirements

### Requirement: Aerospike 命名空间自动查询
系统 SHALL 在创建或编辑 Aerospike 数据源的配置表单中，通过测试连接按钮触发 namespace 查询。namespace 字段 SHALL 改为多选下拉框（`Select mode="multiple"`），用户可从测试连接获取的 namespace 列表中选择一个或多个。保存时 namespace 以逗号分隔字符串存储。

#### Scenario: 测试连接成功后加载 namespace 下拉框
- **WHEN** 用户在 Aerospike 数据源表单中点击「测试连接」并成功
- **THEN** 系统自动查询可用 namespace 列表，namespace 字段切换为多选下拉选择器，显示所有可用 namespace 及编辑模式下已保存的 namespace（如不在列表中则追加标记「已保存」的选项）

#### Scenario: 用户多选 namespace
- **WHEN** 用户在多选下拉框中选中 `test` 和 `prod` 两个 namespace
- **THEN** 提交时 config 中 `namespace` 字段值为 `"test,prod"`

#### Scenario: 查询失败时降级为可输入模式
- **WHEN** 命名空间查询失败（如服务器不可达）
- **THEN** namespace 字段显示为可多选的 Select，支持 `mode="tags"` 让用户手动输入多个 namespace（逗号或回车分隔），并显示错误提示

#### Scenario: 编辑模式下预选已保存的命名空间
- **WHEN** 编辑已存在的 Aerospike 数据源，namespace 字段已有保存的值（如 `"test,prod"`）
- **THEN** 查询完成后自动预选 `test` 和 `prod`；如果某个值不在查询结果中，仍将其作为 Select 的有效选项保留

#### Scenario: 编辑模式下无测试连接结果时 namespace 显示
- **WHEN** 编辑模式下直接打开弹窗，尚未点击测试连接
- **THEN** namespace 字段显示已保存的值（多选模式），选项仅包含已保存的 namespace（标记「已保存」），用户可手动输入追加新值
