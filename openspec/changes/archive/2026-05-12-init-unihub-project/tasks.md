## 1. 项目脚手架搭建

- [x] 1.1 初始化 Go 模块，创建 `go.mod`（`github.com/solo-kingdom/unihub`，Go 1.24），添加 uniface 依赖
- [x] 1.2 创建后端目录结构：`cmd/unihub/main.go`、`internal/handler/`、`internal/service/`、`internal/model/`、`internal/store/`
- [x] 1.3 创建 `web/` 前端工程：初始化 Vite + React + TypeScript 项目，安装 Ant Design 依赖
- [x] 1.4 配置前端基础路由和 Layout 布局（侧边栏导航 + 内容区）
- [x] 1.5 创建 `Makefile`，实现 `dev`、`build`、`clean` 目标
- [x] 1.6 验证：`make dev` 前后端均可启动，`make build` 可生成 `bin/unihub`

## 2. 数据模型与元数据存储

- [x] 2.1 定义数据源模型 `model/datasource.go`：ID、Name、Type、Config（JSON）、CreatedAt、UpdatedAt
- [x] 2.2 定义数据源类型枚举及注册表：`kv-redis`、`kv-boltdb`、`kv-aerospike`、`config-consul`
- [x] 2.3 实现 `store/metadata.go`：基于 BoltDB 的元数据 CRUD 操作
- [x] 2.4 验证：可对数据源配置进行增删改查，数据持久化到 BoltDB 文件

## 3. 数据源连接管理

- [x] 3.1 实现 `store/registry.go`：数据源工厂模式，根据类型创建对应的 uniface Storage 实例
- [x] 3.2 实现 `store/manager.go`：连接缓存管理（sync.Map），按需创建、关闭连接
- [x] 3.3 实现连接测试功能：创建连接后执行 Ping 等简单操作验证可达性
- [x] 3.4 验证：注册 Redis 数据源后可成功测试连接并执行读写操作

## 4. 业务逻辑层

- [x] 4.1 实现 `service/datasource.go`：数据源 CRUD 业务逻辑（创建、查询、更新、删除）
- [x] 4.2 实现数据源名称唯一性校验
- [x] 4.3 实现 `service/data.go`：数据读写业务逻辑，路由到对应数据源的 uniface Storage
- [x] 4.4 验证：通过 service 层可完成数据源的完整生命周期管理和数据操作

## 5. API 服务层

- [x] 5.1 搭建 HTTP 服务框架：chi 路由器、CORS 中间件、请求日志中间件、Recovery 中间件
- [x] 5.2 实现数据源管理 API handler：`GET/POST /api/v1/datasources`、`GET/PUT/DELETE /api/v1/datasources/{name}`
- [x] 5.3 实现连接测试 API handler：`POST /api/v1/datasources/{name}/test`
- [x] 5.4 实现数据操作 API handler：`GET/PUT/DELETE /api/v1/datasources/{name}/data`、`GET /api/v1/datasources/{name}/keys`
- [x] 5.5 实现统一错误响应格式
- [x] 5.6 验证：通过 curl/HTTP 客户端可完成所有 API 操作

## 6. 前端 - 数据源管理页面

- [x] 6.1 创建 API 调用层（`src/api/`）：封装所有后端 API 请求
- [x] 6.2 实现数据源列表页面：Ant Design Table 展示、分页、状态标签
- [x] 6.3 实现新增数据源表单 Modal：名称输入、类型选择、动态配置表单
- [x] 6.4 实现编辑数据源功能：预填充表单、更新提交
- [x] 6.5 实现删除数据源功能：确认对话框、删除后刷新列表
- [x] 6.6 实现连接测试功能：表单内测试按钮、结果展示
- [x] 6.7 验证：通过前端界面可完成数据源的增删改查和连接测试

## 7. 前端 - 数据查询页面

- [x] 7.1 实现数据源选择下拉框组件
- [x] 7.2 实现键列表展示组件（左侧面板）
- [x] 7.3 实现键值详情展示组件（右侧面板，JSON 格式化）
- [x] 7.4 实现新增键值功能
- [x] 7.5 实现编辑键值功能
- [x] 7.6 实现删除键值功能
- [x] 7.7 验证：选择数据源后可浏览、查询、新增、编辑和删除数据

## 8. 单二进制构建与集成

- [x] 8.1 创建 `embed.go`：使用 `go:embed` 嵌入 `web/dist/` 静态资源
- [x] 8.2 实现静态文件服务和 SPA 路由 fallback
- [x] 8.3 实现启动参数解析（端口配置，默认 `:8080`）
- [x] 8.4 完善 `Makefile build` 目标：先构建前端再编译后端
- [x] 8.5 添加 `SKIP_FRONTEND` 环境变量支持跳过前端构建
- [x] 8.6 验证：`make build` 生成单二进制文件，运行后可同时访问管理界面和 API
