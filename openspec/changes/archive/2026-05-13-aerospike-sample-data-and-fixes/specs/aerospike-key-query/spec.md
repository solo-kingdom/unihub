## MODIFIED Requirements

### Requirement: Aerospike 新增键值后直接展示结果
系统 SHALL 在 Aerospike 数据源中新增键值成功后，直接在值详情面板展示刚写入的 key 和 value，不调用键列表刷新。新增失败时 MUST 显示错误提示信息。

#### Scenario: 新增键值成功后展示
- **WHEN** 用户在 Aerospike 数据源中新增键值（如 key=`config:app`，value=`{"theme":"dark"}`）成功
- **THEN** 关闭新增弹窗，key 输入框自动填入 `config:app`，值详情面板展示 `{"theme":"dark"}`，显示编辑和删除按钮

#### Scenario: 新增键值失败且后端返回错误消息
- **WHEN** 新增键值操作失败，后端返回包含 `message` 字段的错误响应
- **THEN** 弹窗保持打开，显示后端返回的具体错误消息

#### Scenario: 新增键值失败且无后端错误消息
- **WHEN** 新增键值操作失败（如网络错误、非标准错误格式）
- **THEN** 弹窗保持打开，显示通用兜底提示"添加失败"
