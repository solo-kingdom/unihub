## 1. 后端模型层 — 类型/实现分离

- [x] 1.1 创建 `internal/model/registry.go`：定义 `Type`、`Implementation` 结构体，硬编码 `SupportedTypes` 和 `SupportedImplementations` 切片，提供 `GetImplementationsByType(typeID)`、`GetType(typeID)`、`GetImplementation(implID)` 等查询辅助函数
- [x] 1.2 修改 `internal/model/datasource.go`：`Datasource` 结构体将 `Type` 字段替换为 `TypeID` + `ImplID`，更新 `CreateDatasourceRequest` 使用 `TypeID` + `ImplID`，移除旧的 `DatasourceType` 类型常量和 `DatasourceCategory`
- [x] 1.3 删除 `internal/model/datasource_types.go`（内容已迁移至 `registry.go`）

## 2. 后端存储层 — 工厂函数与元数据适配

- [x] 2.1 修改 `internal/store/registry.go`：`CreateKVStorage` 改为按 `implId` 分发（而非旧 `DatasourceType`），`TestConnection` 同步适配；consul 暂保持"暂未实现"状态
- [x] 2.2 修改 `internal/store/manager.go`：`Manager` 中的 `GetStorage`、`TestConnection`、`TestNewConnection` 适配新的 `implId` 参数
- [x] 2.3 修改 `internal/store/metadata.go`：无需改 API（按名称存取不变），但确保序列化/反序列化正确使用新字段名（`typeId`/`implId`）。**注意：实现前删除旧 `data/unihub-meta.db` 文件以避免反序列化冲突**

## 3. 后端服务层 — 业务逻辑适配

- [x] 3.1 修改 `internal/service/datasource.go`：`Create` 校验 `typeId` + `implId` 组合有效性（来自 `registry.go`），替代旧的 `IsSupportedType`；`List` 支持可选的 `typeId` 和 `implId` 过滤参数（服务层内存过滤）；`ListTypes` 改为返回嵌入实现列表的类型结构
- [x] 4.1 修改 `internal/handler/datasource.go`：`Create` 解析 `typeId`/`implId` 字段；`List` 读取 `?typeId=` 和 `?implId=` 查询参数并传递到服务层；`ListTypes` 返回新的类型+实现嵌套结构；`TestNewConnection` 改用 `implId`（替代旧 `type`）
- [x] 4.2 修改 `main.go`：`/api/v1/datasource-types` 路由保持不变（handler 内容已改），确认所有路由无需新增（现有路由已覆盖所有端点）

## 5. 前端 API 客户端 — 类型与端点同步

- [x] 5.1 修改 `web/src/api/index.ts`：更新 `Datasource` 接口（`type` → `typeId` + `implId`）；更新 `DatasourceTypeMeta` 接口（新增 `id`、`interface`、`implementations` 嵌套结构）；`ConfigField` 保持不变；`datasourceApi.list()` 支持 `params?: { typeId?, implId? }`；`datasourceApi.create()` 和 `testNew()` 字段适配

## 6. 前端布局重构 — uhub 风格

- [x] 6.1 修改 `web/src/App.tsx`：Layout 改为暗色可折叠 `Sider`（`#1a1a2e`）+ 无 Header；菜单使用 `<Link to={...}>` + `useLocation()` 同步 `selectedKeys`；路由改为 `<AppLayout>` + `<Outlet />` 模式；Content 背景 `#f8f9fc`

## 7. 前端数据源管理页 — 级联选择 + 过滤

- [x] 7.1 修改 `web/src/pages/DatasourcePage.tsx`：列表表格新增「类型」和「实现」列（从 `typeId`/`implId` 解析显示名）；顶部新增类型和实现下拉过滤框，联动刷新列表；创建/编辑 Modal 改为级联选择（类型 Select → 实现 Select 动态过滤 → 配置表单动态渲染）；编辑模式下类型和实现下拉框禁用

## 8. 前端数据查询页 — 字段适配

- [x] 8.1 修改 `web/src/pages/DataQueryPage.tsx`：数据源选择下拉框的显示文本从 `(ds.type)` 改为 `(ds.implId)` 或实现名称，适配新字段名

## 9. 验证

- [x] 9.1 启动后端（`go run .`）确认无编译错误，`GET /api/v1/datasource-types` 返回新的嵌套结构
- [x] 9.2 启动前端（`npm run dev`），验证：侧边栏暗色可折叠、菜单路由跳转正确、创建数据源级联选择可用、列表过滤功能正常
