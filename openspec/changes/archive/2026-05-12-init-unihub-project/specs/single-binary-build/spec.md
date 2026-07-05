## ADDED Requirements

### Requirement: 前端资源嵌入
系统 SHALL 使用 Go 的 `embed` 包将 Vite 构建产物（`web/dist/`）嵌入 Go 二进制。

#### Scenario: 嵌入前端静态资源
- **WHEN** 执行 `go build` 编译项目
- **THEN** `web/dist/` 下的所有文件（HTML、JS、CSS）被嵌入 Go 二进制，运行时无需外部文件

### Requirement: SPA 路由 Fallback
系统 SHALL 对非 API 路径的 HTTP 请求返回 `index.html`，支持 SPA 前端路由。

#### Scenario: 访问前端路由
- **WHEN** 浏览器请求 `/datasources`（非 `/api/v1/` 前缀的路径）
- **THEN** 服务端返回 `index.html`，由前端 JavaScript 处理路由

#### Scenario: API 请求不受影响
- **WHEN** 请求 `/api/v1/datasources`
- **THEN** 正常路由到后端 API handler，不返回 `index.html`

### Requirement: 一体化构建流程
系统 SHALL 通过 Makefile 协调前端构建和后端编译，一键生成包含前端的单二进制文件。

#### Scenario: 一键构建
- **WHEN** 执行 `make build`
- **THEN** 依次执行前端构建（`npm run build`）和后端编译（`go build`），输出 `bin/unihub` 单个可执行文件

#### Scenario: 跳过前端构建
- **WHEN** 执行 `make build` 且 `web/dist/` 已存在且未变更
- **THEN** 可通过环境变量 `SKIP_FRONTEND=1` 跳过前端构建步骤，仅编译 Go 二进制

### Requirement: 二进制启动与端口配置
系统 SHALL 启动时读取配置的监听端口（默认 `:8080`），同时提供 API 和前端静态文件服务。

#### Scenario: 默认启动
- **WHEN** 执行 `./unihub` 不带参数
- **THEN** 服务监听 `:8080`，访问 `http://localhost:8080` 可看到管理界面

#### Scenario: 自定义端口
- **WHEN** 执行 `./unihub -port 9090` 或设置环境变量 `PORT=9090`
- **THEN** 服务监听 `:9090`
