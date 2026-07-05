## Context

unihub 是 solo-kingdom 生态中的应用层工具，基于 uniface 接口库构建。当前状态：

- **uniface** 已提供 `storage/kv`（KV 存储）和 `storage/config`（配置存储）的抽象接口，并有 Redis、BoltDB、Aerospike 等实现
- **unihub** 仓库当前为空项目（仅含 README.md 和 openspec 配置）
- 目标是构建一个带 Web 管理界面的数据源管理平台，前后端一体打包

约束条件：
- Go 1.24，React + TypeScript + Vite + Ant Design
- 必须依赖 `github.com/solo-kingdom/uniface`，不自建存储抽象层
- 最终产物为单个二进制文件

## Goals / Non-Goals

**Goals:**
- 搭建完整的 Go + React 工程骨架，支持开发、构建、打包一体化流程
- 实现数据源的注册、配置、连接测试和生命周期管理
- 提供数据查询和浏览的 Web 界面（针对 KV 类型数据源）
- 通过 RESTful API 实现前后端分离通信
- 前端静态资源通过 `go:embed` 嵌入 Go 二进制

**Non-Goals:**
- 不实现用户认证与权限控制（后续版本考虑）
- 不实现关系型数据库的完整 SQL 查询（首期仅支持 KV 和配置类型数据源）
- 不实现数据源连接池的高级管理（首期使用简单的连接缓存）
- 不实现集群部署和多实例协调

## Decisions

### D1: 项目目录结构

**选择**: 采用标准的 Go 项目布局 + 独立前端子目录

```
unihub/
├── cmd/unihub/          # 入口 main.go
├── internal/
│   ├── handler/          # HTTP handler（API 层）
│   ├── service/          # 业务逻辑层
│   ├── model/            # 数据模型
│   └── store/            # 数据源注册与连接管理
├── web/                  # React 前端工程
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── embed.go              # go:embed 前端静态资源
├── Makefile
├── go.mod
└── go.sum
```

**理由**: `internal` 包防止外部导入；`web` 独立管理前端依赖和构建；`cmd/unihub` 清晰的入口点。

**备选方案**: Monorepo 多模块（Go workspace）→ 过度复杂，当前规模不需要。

### D2: 前后端通信

**选择**: RESTful JSON API，版本化路由 `/api/v1/`

**理由**: 简单直观，适合管理类工具；前端使用 fetch/axios 即可；后续可扩展 WebSocket 做实时数据推送。

**备选方案**: GraphQL → 学习成本高，管理工具场景收益有限。

### D3: 数据源配置存储

**选择**: 使用 BoltDB（嵌入式 KV）存储数据源元数据配置

**理由**: uniface 已有 BoltDB 适配实现，无需额外引入外部数据库依赖，符合单二进制部署目标。

**备选方案**: JSON 文件 → 并发安全性差；SQLite → 引入 CGO 依赖，交叉编译复杂。

### D4: 前端构建与嵌入方案

**选择**: Vite 构建 → 输出到 `web/dist/` → `go:embed` 嵌入 → `net/http` ServeMux 服务静态文件

**理由**: Go 原生支持，无需第三方库；Vite 构建产物纯净；HTTP 请求未匹配 API 路由时 fallback 到 SPA 入口。

**备选方案**: esc/statik 等第三方 embed 工具 → Go 1.16+ 的 `embed` 包已足够。

### D5: 数据源连接管理

**选择**: 使用 `sync.Map` + 工厂模式管理数据源实例，按需创建连接

**理由**: uniface 接口定义了统一的 `Storage` 接口，通过工厂模式根据数据源类型创建对应实现；`sync.Map` 保证并发安全。

**备选方案**: 连接池 + LRU 淘汰 → 首期规模不需要，后续可扩展。

### D6: API 路由与中间件

**选择**: 使用 Go 标准库 `net/http` + 轻量路由（如 `chi`），搭配 CORS、日志、Recovery 中间件

**理由**: 标准库够用，chi 兼容 `http.Handler` 接口，无框架锁定风险。

## Risks / Trade-offs

- **[Risk] BoltDB 并发写入限制** → BoltDB 单写者模型，管理工具场景写入频率低，风险可控。后续可切换到 uniface 的其他 KV 实现。
- **[Risk] 前端嵌入增加二进制体积** → Vite 构建后 gzip 约 500KB-1MB，对于工具类应用可接受。
- **[Trade-off] 首期不支持用户认证** → 降低首版复杂度，适合内部工具场景，后续通过中间件扩展。
- **[Trade-off] 首期仅支持 KV 和 Config 类型数据源** → 复用 uniface 已有能力，快速交付核心功能。
- **[Risk] uniface 接口变更影响** → 通过 Go module 版本管理控制依赖，使用语义化版本锁定。
