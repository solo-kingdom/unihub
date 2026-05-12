## ADDED Requirements

### Requirement: Go 后端项目结构
系统 SHALL 采用标准 Go 项目布局，包含 `cmd/unihub/`（入口）、`internal/handler/`（HTTP 处理）、`internal/service/`（业务逻辑）、`internal/model/`（数据模型）、`internal/store/`（数据源管理）目录。

#### Scenario: 初始化后端工程
- **WHEN** 运行项目初始化
- **THEN** 创建 `go.mod`（模块名 `github.com/solo-kingdom/unihub`）、`cmd/unihub/main.go` 入口文件、`internal/` 下各子包

### Requirement: React 前端工程结构
系统 SHALL 在 `web/` 目录下初始化 React + TypeScript + Vite 工程，使用 Ant Design 组件库。

#### Scenario: 初始化前端工程
- **WHEN** 运行前端初始化
- **THEN** 创建 `web/package.json`、`web/vite.config.ts`、`web/tsconfig.json`、`web/src/` 目录结构，包含 App 根组件和基础路由

### Requirement: Makefile 构建流程
系统 SHALL 提供 Makefile，支持 `make dev`（前后端开发模式）、`make build`（构建前端并打包为二进制）、`make clean`（清理构建产物）命令。

#### Scenario: 开发模式启动
- **WHEN** 执行 `make dev`
- **THEN** 后端以 `go run` 启动，前端以 `vite dev` 启动，支持热更新

#### Scenario: 生产构建
- **WHEN** 执行 `make build`
- **THEN** 前端先执行 `npm run build` 生成 `web/dist/`，后端编译嵌入静态资源，输出 `bin/unihub` 二进制文件

### Requirement: Go 模块依赖管理
系统 SHALL 在 `go.mod` 中声明对 `github.com/solo-kingdom/uniface` 的依赖，并使用 Go 1.24。

#### Scenario: 依赖安装
- **WHEN** 执行 `go mod tidy`
- **THEN** 成功拉取 uniface 及其传递依赖，项目可编译

### Requirement: 前端依赖管理
系统 SHALL 在 `web/package.json` 中声明 React、TypeScript、Ant Design、Vite 等核心依赖。

#### Scenario: 前端依赖安装
- **WHEN** 在 `web/` 目录执行 `npm install`
- **THEN** 所有前端依赖正确安装，`npm run dev` 可正常启动开发服务器
