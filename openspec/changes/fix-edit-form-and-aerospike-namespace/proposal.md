## Why

数据源编辑弹窗的表单回显功能已修复两次（`a99c433`、`ed48900`）仍无法正常展示已保存的配置字段值。根因已确认为 antd 6.3.x 的已知 bug（[#57375](https://github.com/ant-design/ant-design/issues/57375)）：`preserve={false}` 的 Form 中，对条件渲染的 Form.Item 调用 `setFieldsValue` 不生效。同时，Aerospike 数据源的 namespace 配置当前为手动输入的单值文本，缺乏连接时自动拉取且不支持多 namespace；数据查询页面中的 namespace 下拉框无 `onChange` 处理，无法切换命名空间。

## What Changes

- **修复编辑弹窗回显**：移除 `preserve={false}`，config 字段改用 `useEffect` 在 Form.Item 挂载后设值，彻底避开 antd bug
- **Aerospike namespace 通过测试连接自动拉取**：在 datasource 表单中，测试连接成功后自动查询可用 namespace 列表，namespace 字段替换为多选下拉框（`mode="multiple"`），不再手动输入
- **Aerospike 多 namespace 支持**：后端 config 中 `namespace` 支持逗号分隔的多值字符串，`createAerospikeStorage` 为每个 namespace 创建独立 Instance
- **数据查询页 namespace 切换**：namespace 下拉框增加 `onChange` 处理，支持运行时切换 namespace 并重新查询 keys

## Capabilities

### New Capabilities

- `aerospike-multi-namespace`: Aerospike 数据源支持配置多个 namespace（逗号分隔），后端为每个 namespace 创建独立连接 Instance，数据操作同时覆盖所有 namespace
- `aerospike-test-connection-namespace-fetch`: 测试 Aerospike 连接成功后，自动查询可用 namespace 列表并回填到 namespace 多选下拉框

### Modified Capabilities

- `web-console`: 编辑数据源弹窗的字段回显机制从「同步 setFieldsValue + preserve=false」改为「preserve=true + useEffect 分阶段设值」，config 字段在 Form.Item 挂载后通过 useEffect 设置
- `datasource-management`: Aerospike namespace 配置字段从单值文本输入改为多选下拉框，namespace 列表通过测试连接自动获取（而非 watch host/port 防抖查询）
- `aerospike-namespace-query`: 数据查询页面中的 namespace Select 增加 `onChange` 处理，支持动态切换 namespace 并重新获取 keys

## Impact

- **前端**: `web/src/pages/DatasourcePage.tsx`（编辑回显逻辑重写、namespace 字段改为多选）、`web/src/pages/DataQueryPage.tsx`（namespace 切换 onChange）
- **后端**: `internal/store/registry.go`（`createAerospikeStorage` 支持多 namespace 多 Instance）、`internal/model/registry.go`（namespace 字段定义可能调整）
- **不涉及 API 变更**：现有 endpoint 已满足需求
- **不涉及破坏性变更**：已有的单 namespace 数据源兼容（单值视为多值的特例）
