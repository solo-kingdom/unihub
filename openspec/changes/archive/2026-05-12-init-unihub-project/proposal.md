## Why

需要一个基于 uniface 接口层的数据源管理平台，为开发团队提供统一的数据源注册、管理、查询和读写能力。当前 uniface 已定义了 KV 存储和配置存储的抽象接口，但缺少上层的管理工具和统一的访问入口。unihub 将填补这一空白，作为 uniface 生态的应用层工具，降低数据源使用门槛，提供可视化的管理界面和统一的 API 服务。

## What Changes

- 从零初始化 unihub 项目，建立完整的 Go 后端 + React 前端工程结构
- 后端基于 uniface 的 `storage/kv` 和 `storage/config` 接口，实现数据源的注册与管理
- 前端提供数据源管理界面（CRUD）、数据查询与浏览功能
- 提供 RESTful API 作为前后端通信协议
- 最终通过 go embed 将前端静态资源嵌入 Go 二进制，实现单文件分发
- 预留统一数据读写服务的扩展点（指定数据源名称即可操作数据）

## Capabilities

### New Capabilities
- `project-scaffold`: 项目脚手架搭建，包括 Go 后端目录结构、React 前端工程、构建与打包流程
- `datasource-management`: 数据源管理能力，支持数据源类型定义（KV 存储、配置中心等）、连接配置、生命周期管理
- `api-server`: RESTful API 服务，提供数据源管理和数据读写的 HTTP 接口
- `web-console`: Web 管理控制台，提供数据源管理、数据查询与浏览的前端界面
- `single-binary-build`: 单二进制构建方案，将前端资源嵌入 Go 二进制实现一体化部署

### Modified Capabilities

## Impact

- **依赖**: 新增 `github.com/solo-kingdom/uniface` 作为核心依赖，使用其 `storage/kv` 和 `storage/config` 包
- **前端技术栈**: TypeScript + React + Vite + Ant Design，需引入相关 npm 依赖
- **构建系统**: 需要 Makefile 支持前后端联合构建，`go:embed` 嵌入静态资源
- **API**: 暴露 HTTP RESTful API，需定义版本化路由（如 `/api/v1/`）
- **部署**: 单二进制部署模型，简化运维流程
