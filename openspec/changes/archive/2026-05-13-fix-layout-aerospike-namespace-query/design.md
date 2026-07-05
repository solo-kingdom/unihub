## Context

Unihub 管理控制台当前存在两个用户体验问题：

1. **页面滚动问题**：`.unihub-layout` 使用 `height: 100vh` + `padding: 12px`，默认 `box-sizing: content-box` 导致实际渲染高度超过视口；同时 `body` 和 `#root` 使用 `min-height: 100vh`（非固定高度），允许页面溢出滚动。此外 `.unihub-sidebar` 设置 `overflow-y: auto` 允许侧边栏独立滚动，但用户期望侧边栏保持固定。

2. **Aerospike 命名空间输入繁琐**：创建 Aerospike 数据源时需要手动输入 namespace 名称，用户需事先知道可用的 namespace，容易出错。

## Goals / Non-Goals

**Goals:**
- 页面精确占满屏幕高度（`100vh`），消除全页滚动条
- 内容溢出时仅 `.unihub-content` 区域内部滚动，侧边栏保持固定不动
- 创建 Aerospike 数据源时，填写主机地址和端口后自动查询可用命名空间列表，以下拉选择替代手动输入
- 命名空间查询失败时优雅降级，允许手动输入

**Non-Goals:**
- 不改变侧边栏三态（展开/图标/隐藏）交互逻辑
- 不改变数据源管理的其他流程（Redis、BoltDB 等不受影响）
- 不涉及 Aerospike 数据操作的变更（get/set/delete 等）
- 不支持批量查询多个 Aerospike 节点的命名空间（仅查询第一个配置的节点）

## Decisions

### Decision 1: 用 `box-sizing: border-box` 而非 `calc()` 修复布局溢出

使用 `box-sizing: border-box` 让 padding 计入 height，避免手动计算 `calc(100vh - 24px)` 的维护成本。

**替代方案**：使用 `height: calc(100vh - 24px)`。但后续修改 padding 时需同步修改 calc，容易遗漏。

### Decision 2: `body` 和 `#root` 锁定为 `height: 100vh`

`min-height: 100vh` 允许元素增长但不会收缩，改为 `height: 100vh` + `overflow: hidden` 锁定在视口高度。

**替代方案**：仅在 `.unihub-layout` 上修复。但如果 body/#root 仍为 `min-height`，中间可能引入额外高度（如 margin 泄漏）。

### Decision 3: 侧边栏 `overflow: hidden`（不再滚动）

当前仅 2 个菜单项，侧边栏内容不会溢出。未来如需支持更多菜单项，可将菜单部分改为 `overflow-y: auto`（仅 Menu 组件滚动，Logo 和控制按钮保持固定）。

**替代方案**：保留 `overflow-y: auto`。但用户明确要求侧边栏不做滚动。

### Decision 4: 命名空间自动查询触发方式 — 端口变更时自动触发

选择自动触发（debounce 500ms），而非手动按钮。用户体验更流畅——填写主机和端口后，命名空间下拉框自动加载。

**触发条件**：仅当 `host` 和 `port` 均有值时触发。任一为空时不清除已有结果。

**替代方案**：手动「查询命名空间」按钮。更保守但多一步操作。当前选择自动模式以提升流畅度。

### Decision 5: 新增 API 端点而非扩展现有 TestConnection

新增独立端点 `POST /api/v1/datasources/aerospike/namespaces` 专门处理命名空间查询。与连接测试端点职责分离，语义清晰。

**替代方案**：在 `TestNewConnection` 返回中包含命名空间列表。但这会混淆测试连接与命名空间查询的职责。

### Decision 6: 路由注册顺序 — 新路由在 `/{name}` 之前

chi 路由器按注册顺序匹配路由。`POST /api/v1/datasources/aerospike/namespaces` 必须在 `/{name}` 通配路由之前注册，否则 `aerospike` 会被匹配为 `{name}` 参数值。

### Decision 7: 使用 `as.ClientPolicy` 创建临时客户端

不依赖 `ShardClient`（需要 namespace 参数），直接用 `as.NewClientWithPolicy()` 创建裸连接，执行 `RequestInfo("namespaces")` 查询后立即关闭。

## Risks / Trade-offs

- **[Risk] Aerospike 服务器不可达时命名空间查询失败** → 降级为手动文本输入，Dropdown 支持 `mode="tags"` 或保留文本输入模式，不影响用户手动填写
- **[Risk] 侧边栏 `overflow: hidden` 后未来菜单项过多会截断** → 当前仅 2 项无风险；如有需求可改为 `<Menu>` 区域单独 `overflow-y: auto`
- **[Risk] `box-sizing: border-box` 对 Ant Design 组件的兼容性** → Ant Design 默认使用 `border-box`，无冲突
- **[Risk] `POST aerospike/namespaces` 端点可能被误用于非 Aerospike 场景** → 端点路径明确含 `aerospike` 前缀，后端会校验 `implId`（或直接在 handler 中硬编码处理）

## Open Questions

（无——所有技术决策已在探索阶段明确）
