## Why

Aerospike 数据源在三个核心交互路径上存在 UX 缺口：数据源列表看不到已配置的 namespace/set 导致无法区分实例；连接失败后没有重试入口，只能切换数据源再切回来触发重新测试；新增数据时看不到当前操作的 namespace/set 上下文；缺少集群元信息（sets、统计、版本）展示。这些问题削弱了 Aerospike 作为一等公民数据源的可用性。

## What Changes

- **数据源列表增加 namespace/set 列**：对于 Aerospike 实现的数据源，在管理列表表格中显示已配置的 namespace 和 set 值，方便快速区分多个实例
- **数据查询页连接失败重试**：当 Aerospike 连接测试失败时，在「连接失败」Tag 旁增加「重试」按钮，点击后重新发起连接测试
- **Aerospike 元信息获取与展示**：新增后端 meta 查询端点，前端在数据查询页增加可折叠的 meta 信息面板，展示 namespace、set 列表、服务器统计、版本等信息
- **新增数据 Modal 展示 namespace/set 上下文**：在数据查询页的「新增键值」弹窗中，对 Aerospike 数据源显示当前写入的 namespace 和 set 名称

## Capabilities

### New Capabilities

- `aerospike-meta-info`: 后端提供 Aerospike 集群元信息查询 API（namespace、set 列表、服务器统计、版本等），前端在数据查询页以可折叠面板展示

### Modified Capabilities

- `datasource-management`: 数据源列表表格针对 Aerospike 实现增加 namespace 和 set 列展示；测试连接成功后 namespace 字段自动选中所有可用命名空间
- `web-console`: 数据查询页连接失败时增加重试按钮；新增键值 Modal 针对 Aerospike 数据源显示 namespace/set 上下文信息

## Impact

- **前端**: `DatasourcePage.tsx`（表格列扩展、测试连接后 namespace 自动选中）、`DataQueryPage.tsx`（重试按钮、meta 面板、新增 Modal 上下文）
- **后端**: `internal/handler/datasource.go`（新增 meta 端点）、`internal/service/datasource.go`（新增 meta 查询逻辑）
- **新增 API**: `GET /api/v1/datasources/{name}/aerospike/meta?info=sets,statistics,build`
- **不涉及破坏性变更**：现有 API 签名和行为不变
