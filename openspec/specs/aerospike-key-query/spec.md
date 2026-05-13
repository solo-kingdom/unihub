# aerospike-key-query Specification

## Purpose
Aerospike 数据源的 key 直接查询模式——替代键列表浏览，用户通过输入 key 名称直接查询/新增数据。

## Requirements

### Requirement: Aerospike Key 直接查询栏
系统 SHALL 在数据查询页面中，当选中 Aerospike 数据源时，显示 key 直接查询栏替代键列表面板。查询栏包含：key 名称输入框、查询按钮、新增按钮、元信息按钮。

#### Scenario: 显示直接查询栏
- **WHEN** 用户在数据查询页面选中一个 implId 为 `aerospike` 的数据源
- **THEN** 页面不显示键列表面板、搜索框和随机按钮，而是显示包含 key 输入框的工具栏和值详情面板

#### Scenario: 输入 key 并查询
- **WHEN** 用户在 key 输入框中输入 key 名称（如 `user:1001`）并点击查询按钮
- **THEN** 系统调用 `GET /api/v1/datasources/{name}/data?key=user:1001`，若成功则在值详情面板展示该 key 的值，若 key 不存在则显示"键不存在"提示

#### Scenario: 按 Enter 键查询
- **WHEN** 用户在 key 输入框中按下 Enter 键
- **THEN** 等同于点击查询按钮，触发查询操作

#### Scenario: 查询不存在的 key
- **WHEN** 用户查询一个不存在的 key
- **THEN** 值详情面板显示"键不存在"的提示信息，不显示编辑和删除按钮

#### Scenario: 清空输入框
- **WHEN** 用户清空 key 输入框
- **THEN** 值详情面板恢复为空状态（提示"请输入 key 查询"）

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

### Requirement: Aerospike 编辑键值后刷新展示
系统 SHALL 在 Aerospike 数据源中编辑键值成功后，刷新值详情面板展示更新后的值。

#### Scenario: 编辑后刷新值
- **WHEN** 用户编辑当前选中 key 的值并保存成功
- **THEN** 关闭编辑弹窗，值详情面板更新为新值

### Requirement: Aerospike 删除键值后清空展示
系统 SHALL 在 Aerospike 数据源中删除当前查看的键值后，清空值详情面板和 key 输入框。

#### Scenario: 删除后清空
- **WHEN** 用户删除当前正在查看的 key 并确认成功
- **THEN** key 输入框清空，值详情面板恢复为空状态

### Requirement: Aerospike 新增键值弹窗显示上下文
系统 SHALL 在 Aerospike 数据源的新增键值弹窗中，显示当前操作的 namespace 和 set 信息。

#### Scenario: 新增弹窗显示 namespace 和 set
- **WHEN** 用户点击 Aerospike 数据源的新增按钮，打开新增键值弹窗
- **THEN** 弹窗顶部显示当前 namespace（来自 activeNamespace 或 config.namespace）和 set（来自 config.set 或"默认"）的标签信息
