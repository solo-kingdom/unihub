## Why

当前数据源模型使用单一的 `type` 字段（如 `kv-redis`），将 uniface 接口类别和具体实现混为一谈。这导致类型系统缺乏层级结构，前端无法按「类型」或「实现」维度过滤数据源，也无法做到级联选择（先选类型再选实现）。同时，前端 UI 布局（亮色侧边栏 + 独立 Header + `window.location.href` 跳转）与同生态的 uhub 项目风格不一致。

现在是重构的最佳时机——数据源数量尚少，API 尚未对外发布，变更成本低。

## What Changes

- **BREAKING**: 数据源模型从 `type` (如 `kv-redis`) 拆分为 `typeId` (如 `kv`) + `implId` (如 `redis`)，存储层（BoltDB）数据结构随之变更
- **BREAKING**: API 请求/响应字段从 `type` 改为 `typeId` + `implId`，新增类型和实现列表的查询端点
- 新增单文件注册表 `internal/model/registry.go`，硬编码所有支持的「类型」和「实现」及其映射关系，手动同步 uniface 更新
- 配置字段定义 (`ConfigField`) 从类型级别移至实现级别（每个实现有自己的连接参数）
- 新增数据源列表按 `typeId` 和 `implId` 过滤能力
- 前端布局整体重构：暗色可折叠侧边栏（uhub 风格）、标准 React Router `<Link>` + `<Outlet>` 路由模式、去独立 Header
- 前端数据源创建/编辑改为级联选择（类型 → 实现 → 配置表单）
- 前端列表页新增类型和实现的过滤下拉框

## Capabilities

### New Capabilities
- `datasource-type-implementation-model`: 数据源类型与实现的两层注册模型，单文件硬编码注册表，手动同步 uniface

### Modified Capabilities
- `datasource-management`: 数据源结构体从 `type` 改为 `typeId` + `implId`；配置字段移至实现层；API 新增按类型/实现过滤
- `web-console`: 前端布局改为 uhub 风格的暗色侧边栏 + `<Outlet>` 路由；数据源管理页面改为级联选择 + 过滤
- `api-server`: 新增 `GET /api/v1/datasource-types` 返回类型列表（含其下实现）；支持 `?type=kv&implementation=redis` 查询参数过滤

## Impact

- **后端**: `internal/model/` (datasource.go, 新 registry.go, 废 datasource_types.go), `internal/store/` (registry.go, manager.go, metadata.go), `internal/service/datasource.go`, `internal/handler/datasource.go`, `main.go` (路由)
- **前端**: `web/src/App.tsx`, `web/src/api/index.ts`, `web/src/pages/DatasourcePage.tsx`, `web/src/pages/DataQueryPage.tsx`
- **存储**: BoltDB 中 datasource 的 `type` 字段改为 `typeId` + `implId`（旧数据不兼容，首版无需迁移）
- **OpenSpec**: specs 目录下 datasource-management、web-console、api-server 的 spec 需要更新
