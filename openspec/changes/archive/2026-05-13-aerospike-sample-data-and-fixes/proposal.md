## Why

数据查询页面的 Aerospike 模式存在三个问题：(1) 元信息面板中 `sets` 字段返回 null 导致前端崩溃（TypeError: can't access property "length", sets is null）；(2) 添加 key 失败时 catch 分支无兜底提示，用户看不到任何反馈；(3) Aerospike 模式只能精确输入 key 查询，用户不知道有哪些数据，缺少浏览和探索能力。

## What Changes

- 修复后端 `parseSetsFromInfo` 和 `parseNamespacesFromInfo` 返回 nil slice 的 bug，改为返回空切片，避免 JSON 序列化为 null
- 前端 `handleAdd` 的 catch 分支增加通用 `message.error('添加失败')` 兜底提示
- 新增 Aerospike 示例数据浏览功能：后端通过 `ScanAll` + `MaxRecords` 限制采样数量，前端在查询栏下方展示示例数据列表，支持"换一批"刷新

## Capabilities

### New Capabilities
- `aerospike-sample-data`: Aerospike 数据源示例数据浏览——通过 ScanAll 采样展示部分 key-value，用户可点击查看详情或刷新换一批

### Modified Capabilities
- `aerospike-meta-info`: 修复 sets/命名空间 返回 null slice 的 bug，确保 JSON 序列化为空数组而非 null
- `aerospike-key-query`: 添加 key 失败时增加兜底错误提示；整合示例数据面板到查询界面

## Impact

- **前端**: `web/src/pages/DataQueryPage.tsx` — 新增示例数据面板、修复 catch 兜底
- **后端**: `internal/service/datasource.go` — 修复 null slice bug；新增 sample data API
- **后端**: `internal/handler/datasource.go` — 新增 sample data handler
- **后端**: `main.go` — 注册新路由
- **API**: 新增 `GET /api/v1/datasources/{name}/aerospike/sample` 端点
- **依赖**: 无新外部依赖（使用已有 aerospike-client-go v7 的 ScanAll）
