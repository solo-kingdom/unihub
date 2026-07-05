## Context

当前数据查询页面 (`DataQueryPage.tsx`) 的交互模式围绕"键列表浏览"设计：左侧面板列出所有 key，用户点击选中查看值。这套模式对 Redis/BoltDB 工作良好（底层支持 `List()`），但 Aerospike 不支持 `List()` 操作。

当前对 Aerospike 的实际表现：
- 选中 Aerospike 数据源后，`fetchKeys` 调用 `storage.List()` 立即失败并弹出错误提示
- 新增键值成功后触发 `fetchKeys` 刷新列表，再次失败，用户误以为新增没生效
- 随机键、搜索功能都依赖 `List()`，全部不可用
- 连接测试（`TestConnection`）实际成功，但被 List 失败的负面体验掩盖

前端通过 `selectedDatasource?.implId` 已能区分数据源类型，Aerospike 已有独立的 namespace 选择器和元信息面板。需要为 Aerospike 提供独立的数据查询交互模式。

## Goals / Non-Goals

**Goals:**
- 让 Aerospike 数据源在查询页面完全可用：查看、新增、编辑、删除键值
- 为 Aerospike 提供适合其特性的 UI 交互（直接输入 key，而非浏览列表）
- 新增键值后用户能立即看到结果
- 保持 Redis/BoltDB 的现有交互不变

**Non-Goals:**
- 不为 Aerospike 实现 `List()` 操作（底层不支持，需要 Scan API，超出范围）
- 不修改后端 Aerospike 存储层的核心接口
- 不改变数据源管理界面的任何功能
- 不处理元信息面板的改进（它已经是独立的功能）

## Decisions

### Decision 1: 前端条件渲染替代后端抽象

**选择**: 在 `DataQueryPage.tsx` 中根据 `implId === 'aerospike'` 条件渲染不同的查询面板布局。

**替代方案**: 
- (a) 在 `kv.Storage` 接口层面增加 `SupportsList() bool` 能力查询方法 — 改动范围过大，需要改 uniface 包的接口定义
- (b) 捕获 List 错误后降级显示 — 体验差，用户会先看到错误再降级

**理由**: 前端已经有 `implId` 判断的先例（namespace 选择器、元信息面板），条件渲染是最小改动的方案。

### Decision 2: Aerospike 查询模式 — 输入框 + 查询按钮

**选择**: 为 Aerospike 提供一行式查询栏：`[key 输入框] [查询按钮] [新增按钮] [元信息按钮]`，下方直接展示值详情。

**替代方案**:
- (a) 保留左侧面板但显示空状态提示 — 浪费空间，交互别扭
- (b) 用 Scan API 实现键列表 — 需要改底层 aerospike client，复杂度高

**理由**: Aerospike 的典型使用场景是知道 key 名去查询/管理，不是浏览。"输入 key → 查询"更贴合实际使用模式。

### Decision 3: 新增后直接展示结果而非刷新列表

**选择**: Aerospike 新增键值成功后，直接设置 `selectedKey` 和 `keyValue` 展示结果，不调用 `fetchKeys`。

**理由**: 没有 List 能力就无法刷新列表，直接展示结果是唯一可行的反馈方式，且用户体验更好（立即看到刚写入的数据）。

## Risks / Trade-offs

- **[Aerospike 用户需要知道 key 名才能查询]** → 这是 Aerospike 本身的特性限制，通过元信息面板的 set 列表可辅助发现数据。未来可考虑为特定 set 实现 Scan 操作。
- **[前端多了一个 implId 分支]** → 分支逻辑集中在 `DataQueryPage.tsx`，如果未来增加更多不支持 List 的数据源类型，可抽取为通用的"直接查询模式"组件。
