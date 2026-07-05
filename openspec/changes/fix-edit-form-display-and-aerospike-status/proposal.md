## Why

数据源管理的编辑功能无法正确回显已保存的数据到表单中——上层字段（名称、类型、实现）和配置字段（如连接地址、端口等）在编辑弹窗中显示为空，用户无法查看或修改现有配置。同时，数据查询页面缺少对 Aerospike 数据源的差异化展示：没有显示其 namespace 和连接状态，用户无法确认当前连接的是哪个 namespace 以及是否可用。

## What Changes

- **修复编辑弹窗回显**：调整 `DatasourcePage` 中 `form.setFieldsValue` 的调用时机，从 Modal 打开前移到 Form 挂载后的 `useEffect` 中，确保 `destroyOnHidden` + `preserve={false}` 组合下表单值能正确保留和展示
- **Aerospike 数据查询页展示 namespace 和连接状态**：在 `DataQueryPage` 选中 Aerospike 数据源后，自动展示其 namespace，并显示连接测试结果（连接成功/失败）
- **增强 fetchTypes 错误处理**：`listTypes` API 调用失败时增加日志输出，避免静默失败导致 edit 表单永远不可用

## Capabilities

### New Capabilities

- `aerospike-connection-status-in-query`: 数据查询页面在选中 Aerospike 数据源后，自动展示 namespace 名称和连接测试状态

### Modified Capabilities

- `web-console`: 编辑数据源弹窗需要正确回显所有字段值（名称、类型、实现、配置字段），确保 `destroyOnHidden` + `preserve={false}` 组合下的表单状态管理正确

## Impact

- **前端**: `web/src/pages/DatasourcePage.tsx` (编辑回显逻辑)、`web/src/pages/DataQueryPage.tsx` (Aerospike 状态展示)
- **不涉及后端 API 变更**：连接测试接口 `POST /api/v1/datasources/{name}/test` 已存在，Key 列表接口已存在
- **无破坏性变更**
