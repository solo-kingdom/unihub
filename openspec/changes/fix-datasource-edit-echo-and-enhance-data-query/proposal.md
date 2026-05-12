## Why

数据源编辑表单在编辑模式下无法正确回显已保存的配置值（如 Redis 连接地址、密码等），配置字段始终显示空白。根本原因是编辑流程使用不可靠的 `setTimeout(0)` hack 来等待 React 渲染 config 字段后再通过 `form.setFieldsValue` 写入值，这在 React 18 自动批处理下经常失败。同时，数据查询功能过于简陋——只能列出全部 key 后手动翻找，缺少按模式搜索 key 和随机获取 key 的能力，导致在大量 key 的数据源中定位数据极其低效。

## What Changes

- **修复编辑回显 Bug**：重构 `DatasourcePage` 编辑表单架构，将两个分离的 `<Form>` 合并为单个 `<Form>`，改用 React 声明式数据流（`Form.Item` + `initialValues` 或 `useEffect` 同步）替代 `setTimeout(0)` hack，确保编辑时配置字段可靠回显
- **新增 Key 模式搜索**：后端新增 `GET /api/v1/datasources/{name}/keys?pattern=xxx` 支持按 glob 风格模式（如 `user:*`、`*:config`）过滤 key 列表；前端数据查询页面新增搜索输入框实时过滤
- **新增随机 Key 获取**：后端新增 `GET /api/v1/datasources/{name}/keys/random`（或 `GET /api/v1/datasources/{name}/data?random=true`）端点返回一个随机 key 及其值；前端新增「随机获取」按钮
- **新增 Key 存在性检查**：后端新增 `HEAD /api/v1/datasources/{name}/data?key=xxx` 端点快速检查 key 是否存在；前端新增 key 时做重复检测

## Capabilities

### New Capabilities
- `key-search`: 支持按 glob 模式搜索/过滤数据源中的 key 列表
- `random-key`: 支持从数据源中随机获取一个 key 及其值

### Modified Capabilities
- `web-console`: 数据查询页面新增 key 搜索输入框、随机获取按钮、key 存在性检查
- `api-server`: 新增 key 搜索端点、随机 key 端点、key 存在性检查端点

## Impact

- **前端**：`web/src/pages/DatasourcePage.tsx`（编辑回显重构）、`web/src/pages/DataQueryPage.tsx`（搜索/随机功能）、`web/src/api/index.ts`（新增 API 调用）
- **后端**：`internal/handler/data.go`（新增 handler）、`internal/service/data.go`（新增 service 方法）、`internal/store/registry.go`（aerospike adapter 可能需要补充 List 支持）
- **依赖**：无新增外部依赖
- **接口变化**：新增 API 端点，不涉及 **BREAKING** 变更，现有端点行为不变
