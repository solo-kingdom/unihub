## 1. Bug 修复：sets/namespaces null slice 崩溃

- [x] 1.1 修改 `internal/service/datasource.go` 中 `parseSetsFromInfo` 函数，将所有 `return nil` 改为 `return []string{}`
- [x] 1.2 修改 `internal/service/datasource.go` 中 `parseNamespacesFromInfo` 函数，将 `return nil` 改为 `return []string{}`
- [x] 1.3 确认 `setsMap[ns] = parseSetsFromInfo(...)` 赋值不会写入 nil（检查空 set 的 namespace 是否被跳过）

## 2. Bug 修复：添加 key 失败无提示

- [x] 2.1 在 `web/src/pages/DataQueryPage.tsx` 的 `handleAdd` catch 分支中，添加通用兜底 `message.error('添加失败')`（当 `err?.response?.data?.message` 不存在时触发）

## 3. 后端：示例数据 API

- [x] 3.1 在 `internal/service/datasource.go` 中新增 `QueryAerospikeSample` 方法：连接 Aerospike 节点，使用 `ScanAll` + `MaxRecords=limit` 扫描指定 namespace/set，返回 `[{key, value}]` 列表
- [x] 3.2 在 `internal/handler/datasource.go` 中新增 `HandleAerospikeSample` handler：解析 `limit` query 参数（默认 20），调用 service 方法，返回 JSON
- [x] 3.3 在 `main.go` 中注册路由 `GET /api/v1/datasources/{name}/aerospike/sample`

## 4. 前端：示例数据面板

- [x] 4.1 在 `web/src/api/index.ts` 中新增 `queryAerospikeSample` API 方法，调用 `GET /datasources/{name}/aerospike/sample`
- [x] 4.2 在 `DataQueryPage.tsx` 中新增示例数据相关状态：`sampleData`、`sampleLoading`
- [x] 4.3 在 `handleSelectDs` 中，当选中 Aerospike 数据源时，自动调用 sample API 加载示例数据
- [x] 4.4 在 Aerospike 模式的查询栏下方渲染示例数据面板：表格/列表展示 key + 截断 value 预览，支持点击某条数据在值详情面板展示
- [x] 4.5 添加"换一批"按钮，重新调用 sample API 刷新列表
- [x] 4.6 处理空数据、加载中、请求失败三种边界状态
