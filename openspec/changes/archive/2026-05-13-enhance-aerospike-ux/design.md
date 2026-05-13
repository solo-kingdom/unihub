## Context

当前 `DatasourcePage` 的列表表格仅显示名称、类型、实现、创建时间四列。已保存的 Aerospike namespace/set 配置在列表中完全不可见，用户无法区分多个 Aerospike 数据源实例（例如连接同一集群不同 namespace 的两个数据源在列表中看起来完全一样）。

`DataQueryPage` 在选中 Aerospike 数据源后会自动测试连接，但连接失败时仅显示「连接失败」Tag，无法直接重试——用户必须切换到其他数据源再切回来才能触发重新测试。

数据查询页的「新增键值」Modal 对所有数据源类型一视同仁，仅有键名和值两个输入框。Aerospike 用户无法知晓数据将被写入哪个 namespace 和 set。

Aerospike 的 `RequestInfo` API 支持查询丰富的集群元信息（sets、统计数据、版本、节点信息等），但当前产品仅利用了 `namespaces` 一条命令。

## Goals / Non-Goals

**Goals:**
- 数据源列表表格中可见 Aerospike 的 namespace 和 set 配置
- 数据查询页连接失败后可一键重试，无需切换数据源
- 后端提供 Aerospike 元信息查询端点，前端以面板形式展示
- 新增键值 Modal 对 Aerospike 显示 namespace/set 上下文

**Non-Goals:**
- 不改变非 Aerospike 数据源在表格和查询页的行为
- 不修改数据源配置存储模型（config 仍是 `map[string]string`）
- 不修改 Aerospike 数据操作的底层逻辑（namespace/set 路由已在 Instance 层面处理）
- 不在 meta 面板中提供实时写入能力（只读展示）

## Decisions

### D1: 表格增加 namespace 和 set 列

**选择**: 在数据源列表表格中新增「命名空间」和「Set」两列，对所有数据源类型均渲染，非 Aerospike 数据源显示 `-`。

```
Before:
┌────────┬────────┬───────────┬────────────┬────────┐
│  名称  │  类型  │   实现    │  创建时间   │  操作   │
├────────┼────────┼───────────┼────────────┼────────┤
│ my-as  │ KV存储 │ Aerospike │ 2026-05-13 │ 编辑.. │
└────────┴────────┴───────────┴────────────┴────────┘

After:
┌────────┬────────┬───────────┬───────────┬──────┬────────────┬────────┐
│  名称  │  类型  │   实现    │  命名空间  │ Set  │  创建时间   │  操作   │
├────────┼────────┼───────────┼───────────┼──────┼────────────┼────────┤
│ my-as  │ KV存储 │ Aerospike │ test,prod │ users│ 2026-05-13 │ 编辑.. │
│ my-red │ KV存储 │ Redis     │ -         │ -    │ 2026-05-12 │ 编辑.. │
└────────┴────────┴───────────┴───────────┴──────┴────────────┴────────┘
```

**替代方案**:
- ❌ 仅 Aerospike 可见这两列 → antd Table columns 是静态定义的，动态添加/移除列会让其他类型的数据行出现列偏移，实现复杂且体验割裂
- ❌ 合并为单列「配置摘要」→ 信息密度过高，不同实现格式不统一
- ✅ 两列常驻，非 Aerospike 显示 `-` → 实现简单，列对齐一致，不影响其他类型的视觉体验

**实现要点**:
- 列定义中通过 `record.implId === 'aerospike'` 条件渲染值，否则返回 `-`
- namespace 值来自 `record.config.namespace`，set 值来自 `record.config.set`

### D2: 连接失败重试按钮

**选择**: 在 `DataQueryPage` 连接状态 Tag 旁增加「重试」按钮（仅连接失败时可见），点击后调用 `datasourceApi.test(name)` 重新测试并更新 `connectionStatus`。

```
┌──────────────────────────────────────────────────────────────┐
│ [Datasource ▼]  [新增]  [刷新]  [namespace ▼]               │
│                                          ┌──────────────────┤
│                                          │ 连接失败  [🔄 重试]│
│                                          └──────────────────┤
└──────────────────────────────────────────────────────────────┘
```

**替代方案**:
- ❌ 自动定时重试 → 浪费网络资源，用户不可控
- ❌ 将测试逻辑移到 `fetchKeys` 错误处理中 → 混淆关注点，keys 查询失败不等同于连接失败
- ✅ 显式按钮 → 用户主动触发，行为清晰

**实现要点**:
- 提取 `handleRetryConnection` 函数，封装测试连接逻辑（当前 `handleSelectDs` 中内联的 test 调用）
- 按钮仅 `connectionStatus && !connectionStatus.success` 时渲染
- 使用 `Button` + `ReloadOutlined` icon，size="small"

### D3: Aerospike 元信息查询端点

**选择**: 新增 `GET /api/v1/datasources/{name}/aerospike/meta` 端点，接受 `info` query 参数指定要查询的元信息类型，连接 Aerospike 节点后逐项查询并返回。

**端点设计**:
```
GET /api/v1/datasources/{name}/aerospike/meta?info=sets,statistics,build,node,cluster-name

Response 200:
{
  "nodeId": "BB90200...",
  "build": "6.4.0.2",
  "clusterName": null,
  "namespaces": ["test", "prod"],
  "sets": {
    "test": ["users", "orders"],
    "prod": ["sessions"]
  },
  "statistics": {
    "cluster_size": "3",
    "objects": "50000",
    "client_connections": "12",
    ...
  }
}
```

**Info 命令映射**:
| query 参数    | Aerospike Info 命令      | 返回类型               |
|---------------|--------------------------|------------------------|
| `namespaces`  | `namespaces`             | `[]string`             |
| `sets`        | `sets/<每个ns>` 逐ns查询  | `map[string][]string`  |
| `statistics`  | `statistics`             | `map[string]string`    |
| `build`       | `build`                  | `string`               |
| `node`        | `node`                   | `string`               |
| `cluster-name`| `cluster-name`           | `string`（可能为空）    |

默认（无 `info` 参数时）返回 `namespaces` + `sets`。

**替代方案**:
- ❌ 在现有 namespace 查询端点中追加更多字段 → 改变已有 API 语义，破坏向后兼容
- ❌ 前端直接通过 WebSocket 连接 Aerospike → 绕过安全边界，增加前端复杂度
- ✅ 独立端点按需查询 → 关注点分离，已部署客户端不受影响

**后端实现**:
- Handler: `GET /api/v1/datasources/{name}/aerospike/meta`
- Service: `QueryAerospikeMeta(name, infoTypes []string)` → 读取 datasource config 获取 host/port，连接 Aerospike 节点，逐项执行 Info 命令，返回结构化结果
- 连接复用：每次查询创建临时客户端（轻量），用完即关闭，不加入连接池

### D4: 新增键值 Modal 上下文展示

**选择**: 在「新增键值」Modal 表单顶部，对 Aerospike 数据源增加一行描述文字，显示当前写入的 namespace 和 set。

```
┌──────────────────────────────────────────┐
│ 新增键值                                  │
│                                          │
│ 📍 namespace: test    📦 set: users     │  ← 新增：上下文指示
│                                          │
│ 键名:  [_______________]                │
│ 值:    [_______________]                │
│                                          │
│              [添加]                      │
└──────────────────────────────────────────┘
```

**信息来源**:
- namespace: 来自 `activeNamespace` state（当前 query 页切换到的 namespace），或 `selectedDatasource.config.namespace`
- set: 来自 `selectedDatasource.config.set`，未配置时显示 `(默认)`

**替代方案**:
- ❌ 在 Modal 中增加可编辑的 set 选择器 → set 在连接级别已固定，此处编辑会造成数据写入不一致；如需切换 set 应回到数据源管理页修改配置
- ❌ 完全不显示上下文 → 当前状态，用户困惑
- ✅ 只读上下文指示 → 信息透明，不引入新复杂度

**实现要点**:
- 仅 `selectedDatasource?.implId === 'aerospike'` 时渲染
- 使用 `Descriptions` 或 `Space` + `Tag` 展示，简洁不占空间

## Risks / Trade-offs

- **[Risk] meta 查询每次创建临时 Aerospike 客户端，高频率调用可能产生连接开销 → Mitigation**: meta 查询预期为低频操作（用户主动点击查看），不会频繁触发；前端可缓存查询结果在组件 state 中
- **[Risk] `sets` 查询需要循环每个 namespace 分别调用 Info → Mitigation**: namespace 数量通常有限（个位数），循环开销可接受；前端仅在 meta 面板展开时触发一次查询
- **[Trade-off] 表格增加两列使行宽增加，可能挤占操作列空间 → Mitigation**: namespace 和 set 列设置 `ellipsis: true`，宽度各 120px；非 Aerospike 行仅显示 `-`，不影响可读性

## Open Questions

- Meta 面板是否需要支持用户选择查询哪些字段（如只查 statistics 不查 sets）？当前设计前端发送请求时指定 `info` 参数，但 UI 是否提供筛选开关待定
- statistics 返回的原始 key-value 数量较多（50+），是否需要按类别分组展示（如内存、连接、读写统计）？
