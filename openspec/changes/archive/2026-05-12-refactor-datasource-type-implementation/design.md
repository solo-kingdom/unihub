## Context

当前 `Datasource` 模型使用单一 `type` 字段同时编码接口类别和具体实现（如 `kv-redis` = KV 接口 + Redis 实现）。`Category` 字段存在但仅用于展示，未驱动任何逻辑。前端 UI 采用亮色侧边栏 + 独立 Header + `window.location.href` 跳转，与同生态 uhub 项目风格不一致。

uniface v0.1.x 提供两个核心接口：`kv.Storage` 和 `config.Storage`，以及四个实现包：redis、boltdb、aerospike、consul（待接入）。当前后端通过 `registry.go` 中的 `switch` 语句硬编码类型到实现的工厂映射。

约束：不修改 uniface，注册表在 unihub 侧以单文件硬编码维护。

## Goals / Non-Goals

**Goals:**
- 数据源模型从 `type`（如 `kv-redis`）拆分为 `typeId`（如 `kv`）+ `implId`（如 `redis`）
- 单文件注册表 `internal/model/registry.go` 集中管理类型和实现的映射关系
- `ConfigField` 从类型级别移至实现级别（每个实现有独立的连接参数）
- `POST /api/v1/datasources` 等 API 适配新字段
- 数据源列表支持 `?typeId=kv&implId=redis` 查询参数过滤
- 新增 `GET /api/v1/datasource-types` 返回类型列表（含其下实现），支持前端级联选择
- 前端布局整体重构为 uhub 风格（暗色可折叠侧边栏、`<Outlet>` 路由、去独立 Header）
- 前端数据源管理页改为级联选择（类型 → 实现 → 配置表单）+ 过滤下拉框

**Non-Goals:**
- 不修改 uniface 本身（不增加注册接口）
- 不迁移已有的 BoltDB 数据（首版清库重建，或手动迁移）
- 不实现 Consul config.Storage 的完整连接测试（当前就是 `暂未实现`，保持不变）
- 不引入新的数据源实现类型（仅重构现有 4 种）

## Decisions

### D1: 注册表结构 — 单文件硬编码

**选择**: `internal/model/registry.go` 包含两个硬编码切片：`SupportedTypes` 和 `SupportedImplementations`，其中 `Implementation` 通过 `TypeID` 关联到 `Type`。

```
SupportedTypes = []Type{
  {ID: "kv",     Name: "KV 存储",   Interface: "kv.Storage"},
  {ID: "config", Name: "配置中心",   Interface: "config.Storage"},
}

SupportedImplementations = []Implementation{
  {ID: "redis",     TypeID: "kv",     Name: "Redis",     ConfigFields: [{...}]},
  {ID: "boltdb",    TypeID: "kv",     Name: "BoltDB",    ConfigFields: [{...}]},
  {ID: "aerospike", TypeID: "kv",     Name: "Aerospike", ConfigFields: [{...}]},
  {ID: "consul",    TypeID: "config", Name: "Consul",    ConfigFields: [{...}]},
}
```

**理由**: 简单直观，uniface 更新时只需手动同步这一个文件。不引入反射或代码生成，避免过度工程。查找 O(1) via map 缓存。

**备选方案**: 
- uniface 侧增加注册接口 → 需要修改 uniface，跨仓库协调成本高
- 代码生成 → 引入构建复杂度，收益有限

### D2: API 结构 — 类型和实现分离返回

**选择**: `GET /api/v1/datasource-types` 返回类型列表，每个类型内嵌其下的实现列表：

```json
[
  {
    "id": "kv",
    "name": "KV 存储",
    "interface": "kv.Storage",
    "implementations": [
      {"id": "redis", "name": "Redis", "configFields": [...]},
      {"id": "boltdb", "name": "BoltDB", "configFields": [...]},
      {"id": "aerospike", "name": "Aerospike", "configFields": [...]}
    ]
  },
  {
    "id": "config",
    "name": "配置中心",
    "interface": "config.Storage",
    "implementations": [
      {"id": "consul", "name": "Consul", "configFields": [...]}
    ]
  }
]
```

**理由**: 一次请求获取完整信息，前端级联选择无需额外请求。与现有 `/datasource-types` 端点兼容（结构变化但语义一致）。后端用 `GetImplementationsByType(typeID)` 辅助函数做过滤。

**备选方案**: 分两个端点（`/types` + `/types/{id}/implementations`）→ 增加前端请求数，无必要

### D3: 列表过滤 — 服务层过滤，非 BoltDB 层

**选择**: `GET /api/v1/datasources?typeId=kv&implId=redis` — 后端从 BoltDB 全量读取后在服务层内存过滤。

**理由**: BoltDB 是 KV 存储，不支持复杂查询。内存过滤对现有规模（预期 < 100 个数据源）完全够用，实现简单。

**备选方案**: 在 BoltDB 中使用次级索引桶 → 过度设计，现在不需要

### D4: Datasource JSON 序列化 — 保持旧字段兼容读取，写入用新字段

**选择**: `Datasource` 结构体使用 `typeId` + `implId` JSON 标签。不保留旧 `type` 字段的 JSON 标签。

**理由**: 这是 BREAKING 变更（见 proposal），但数据源数量极少（通常 < 10），清库重建成本为零。如果未来需要迁移，可写一个简单的一次性脚本遍历 BoltDB 记录。

**备选方案**: 同时保留 `type` 和 `typeId`/`implId` → 引入混淆，增加维护负担

### D5: 工厂函数 — 按 implId 分发

**选择**: `CreateKVStorage(implId string, config)` 直接按 `implId` 分发。对 `config-consul` 类型暂仍回到 `TestConnection` 中的特殊分支（config.Storage 接口与 kv.Storage 不同，工厂需要分别处理）。

```
switch implId {
case "redis":     return redis.New(...)
case "boltdb":    return boltdb.New(...)
case "aerospike": return aerospikeAdapter(...)
case "consul":    return nil, ErrConfigNotImplemented
}
```

**理由**: `implId` 唯一确定工厂逻辑，不再需要从 `type` 中解析语义。consul 的 config.Storage 接口与 kv.Storage 不同，需要单独的工厂路径（Non-Goal：本变更不实现 consul 完整集成）。

### D6: 前端布局 — uhub 模式

**选择**: 
- 侧边栏暗色 `#1a1a2e`，可折叠，带 "UniHub" 品牌字
- 菜单使用 `<Link to={...}>`（React Router 标准跳转）
- 选中状态通过 `useLocation()` + `selectedKeys` 动态同步
- 去独立 Header，页面内自带标题
- Content 背景 `#f8f9fc`（uhub 风格）
- 路由结构：`<AppLayout>` 内用 `<Outlet />` 渲染子路由

**理由**: 与 uhub 视觉一致，使用 React Router 标准模式，避免 `window.location.href` 造成的全页刷新。

### D7: 级联选择 UI

**选择**: 创建/编辑表单中，先选「类型」下拉框，根据选中类型过滤「实现」下拉框的选项，选择实现后动态渲染配置字段。

**理由**: 直观的两步选择，防止用户选择不兼容的组合（如类型=config 时实现不能选 redis）。实现选项过滤逻辑在前端完成（数据已从 `/datasource-types` 端点获取）。

## Risks / Trade-offs

- **[Risk] BoltDB 旧数据不兼容** → 首版清库：删除 `data/unihub-meta.db` 后重启即可。无生产数据。
- **[Risk] uniface v0.1.2 模块缓存问题** → `go.mod` 引用 v0.1.2 但缓存仅有 v0.1.1。需要在实现前先 `go mod download` 确保 v0.1.2 可用。
- **[Risk] Consul config.Storage 接口差异** → `config.Storage` 与 `kv.Storage` 方法签名完全不同（Watch、ReadWithCache 等）。本变更仅保持现状（consul 测试返回"暂未实现"），后续独立变更实现。
- **[Trade-off] 注册表手动同步** → uniface 更新时需手动更新 `registry.go`。当前 uniface 迭代频率低，可接受。
- **[Trade-off] 前端一次请求获取所有类型+实现** → 未来类型/实现增多时响应变大，但管理工具场景下预期数量有限。
