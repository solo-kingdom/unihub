## Why

当前 Unihub 管理控制台存在两个影响用户体验的问题：1) 页面存在不必要的全页滚动条，内容溢出时侧边栏也会单独滚动，而非仅内容区域滚动；2) 新增 Aerospike 数据源时，命名空间字段需要用户手动输入，增加了使用门槛和出错概率。这两个修复将提升界面的专业性和操作的便捷性。

## What Changes

- 修复页面布局：页面高度精确匹配屏幕高度，消除全页滚动条；内容溢出时仅右侧内容区域滚动，左侧菜单栏固定不动
- 新增 Aerospike 命名空间自动查询：在新增 Aerospike 数据源时，根据用户输入的主机地址和端口自动查询可用的命名空间列表，以下拉选择框替代手动文本输入

## Capabilities

### New Capabilities

- `aerospike-namespace-query`: 新增 Aerospike 命名空间自动查询能力——后端提供查询端点，前端在创建 Aerospike 数据源时自动获取可用命名空间
- `layout-height-fix`: 修复页面高度布局——页面精确占满屏幕，无全页滚动条；内容溢出时仅内容区内部滚动，侧边栏保持固定

### Modified Capabilities

- `web-console`: 布局要求变更——页面整体高度锁定为屏幕高度（不再有全页滚动），侧边栏不再自身滚动（`overflow: hidden`），仅内容区域可内部滚动
- `datasource-management`: Aerospike 命名空间字段交互变更——从纯文本输入改为自动查询的下拉选择器，用户填写主机地址和端口后自动获取可用命名空间
- `api-server`: 新增 `POST /api/v1/datasources/aerospike/namespaces` 端点，用于查询 Aerospike 集群的可用命名空间列表

## Impact

- 受影响文件：`web/src/index.css`（body/#root 高度固定）、`web/src/App.scss`（box-sizing、sidebar overflow）、`web/src/pages/DatasourcePage.tsx`（namespace 字段改为 Select + 自动查询）、`web/src/api/index.ts`（新增 API 函数）、`main.go`（新增路由）、`internal/handler/datasource.go`（新增 handler）、`internal/service/datasource.go`（新增 service 方法）
- 无 BREAKING 变更——所有变更均为增强性修复，不影响现有 API 契约
- 无新增依赖——Aerospike 命名空间查询复用已有的 `aerospike/aerospike-client-go/v7` 客户端库
