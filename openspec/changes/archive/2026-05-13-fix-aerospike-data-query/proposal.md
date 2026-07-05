## Why

Aerospike 数据源在数据查询页面完全不可用：选中后键列表加载失败（因为 Aerospike 不支持 List 操作），导致用户无法浏览、无法新增键值、无法使用随机键功能。用户的所有操作（新增、查看、编辑）都因为缺少键列表入口而被阻断。

## What Changes

- 对 Aerospike 数据源隐藏键列表面板、搜索框、随机键按钮（因为底层 `List()` 不支持）
- 为 Aerospike 数据源新增**直接输入 key 查询**的交互模式（输入框 + 查询按钮）
- Aerospike 新增键值成功后，不再调用 `fetchKeys` 刷新键列表，改为直接选中并展示刚新增的 key-value
- 为 Aerospike 数据源新增键值时，在表单中展示当前操作的 namespace/set 上下文信息
- 后端 `ListKeys` 和 `RandomKey` API 对 Aerospike 返回明确的错误信息，避免前端误判为"连接失败"

## Capabilities

### New Capabilities
- `aerospike-key-query`: Aerospike 数据源的 key 直接查询模式——替代键列表浏览，用户通过输入 key 名称直接查询/新增数据

### Modified Capabilities
- `key-search`: Aerospike 数据源不适用键搜索功能，前端需按 implId 条件隐藏搜索 UI
- `random-key`: Aerospike 数据源不支持随机键，前端需按 implId 条件隐藏随机按钮

## Impact

- **前端**: `web/src/pages/DataQueryPage.tsx` — 主要改动文件，根据 `implId` 分支渲染不同的 UI 布局
- **后端**: `internal/service/data.go` — `ListKeys`/`RandomKey` 对 Aerospike 返回更明确的错误信息
- **API**: 无新增端点，无破坏性变更
- **依赖**: 无新依赖
