## Context

数据查询页面的 Aerospike 模式存在两类问题：

1. **Bug 修复**：后端 `parseSetsFromInfo` 和 `parseNamespacesFromInfo` 在没有数据时返回 Go 的 `nil` slice，JSON 序列化为 `null`，导致前端访问 `.length` 时 TypeError 崩溃。前端 `handleAdd` 的 catch 分支只处理了 `err.response.data.message` 存在的情况，其他错误类型无任何提示。

2. **功能缺失**：Aerospike 模式只有精确 key 查询，用户无法浏览数据。Aerospike 不支持 Redis 的 `SCAN`/`KEYS` 操作，但 aerospike-client-go v7 提供了 `ScanAll` 方法，支持通过 `MaxRecords` 限制返回条数进行采样。

当前数据流：
```
前端 DataQueryPage → dataApi / datasourceApi → handler → service → aerospike client
```

涉及文件：
- 后端：`internal/service/datasource.go`（meta 查询 + 新增 sample 查询）
- 后端：`internal/handler/datasource.go`（新增 handler）
- 后端：`main.go`（路由注册）
- 前端：`web/src/pages/DataQueryPage.tsx`（UI 修改）
- 前端：`web/src/api/index.ts`（新增 API 方法）

## Goals / Non-Goals

**Goals:**
- 修复 sets/namespaces null slice 导致前端崩溃的问题
- 修复添加 key 失败无提示的问题
- 提供 Aerospike 示例数据浏览能力，让用户可以快速了解数据源中的数据形态
- 交互简洁：采样展示 + 换一批刷新，不做复杂分页

**Non-Goals:**
- 不实现 Aerospike 的完整 key 遍历/分页（ScanAll 本身无 offset/cursor 机制）
- 不修改 uniface/pkg 中的 aerospike 客户端代码（sample 功能直接在 unihub service 层用 aerospike client 实现）
- 不实现 set 维度的筛选过滤（后续可扩展）

## Decisions

### Decision 1: 示例数据使用 ScanAll + MaxRecords

**选择**：使用 aerospike-client-go v7 的 `client.ScanAll(policy, namespace, set, binNames...)` + `policy.MaxRecords = 20`

**替代方案**：
- A. 分页 Token（PartitionFilter + digest 游标）：实现复杂度高，需要维护分页状态
- B. 随机 Key API 扩展：多次调用随机接口效率低，且无法一次展示多条

**理由**：ScanAll 天然无序，配合 MaxRecords 限制，天然适合"随机采样"场景。实现简单，一次调用返回 N 条。

### Decision 2: 新增独立 API 端点

**选择**：`GET /api/v1/datasources/{name}/aerospike/sample?limit=20`

**替代方案**：扩展现有 `ListKeys` API 对 Aerospike 特殊处理

**理由**：现有 `ListKeys` 在 `aerospikeAdapter` 中硬编码返回 `not supported`。新增独立端点语义更清晰，返回结构包含 key + value（不仅是 key 列表），与 ListKeys 的只返回 key 模式不同。

### Decision 3: 前端示例数据面板放在查询栏下方

**选择**：在 key 查询栏和值详情面板之间插入示例数据区域。默认自动加载，用户可点击"换一批"刷新。点击某条数据直接在值详情面板展开。

**理由**：用户进入页面即可看到数据，无需先猜 key 名。与现有精确查询互补——示例数据帮助探索，精确查询用于已知 key。

### Decision 4: null slice 修复在后端

**选择**：在 `parseSetsFromInfo` 和 `parseNamespacesFromInfo` 中，将 `return nil` 改为 `return []string{}`

**替代方案**：在前端加 null guard（`sets?.length`）

**理由**：后端是数据源头，修复后所有消费方都受益。前端 null guard 可作为额外防御但不解决根因。

## Risks / Trade-offs

- **[ScanAll 性能]** → MaxRecords 限制扫描量，对生产集群影响可控。如果数据量巨大（百万级），即使是 20 条也需要扫描分区。可考虑后续增加 `RecordsPerSecond` 限速。目前 limit=20 足够轻量。

- **[ScanAll 在空 set 上]** → ScanAll 对空 set 返回空结果集，前端显示"暂无示例数据"，不影响功能。

- **[sample API 需要直连 Aerospike client]** → 当前 service 层通过 `CreateKVStorage` 拿到的是 `aerospikeAdapter`，不暴露底层 client。sample 实现需要在 service 层直接创建 aerospike client（复用现有 meta 查询的连接方式），与 meta 查询保持一致的模式。
