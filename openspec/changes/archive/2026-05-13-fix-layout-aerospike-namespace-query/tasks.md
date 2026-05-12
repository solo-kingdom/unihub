## 1. 页面高度布局修复（前端 CSS）

- [x] 1.1 修改 `web/src/index.css`——将 `body` 和 `#root` 的 `min-height: 100vh` 改为 `height: 100vh`，并添加 `overflow: hidden`，锁定页面高度链路
- [x] 1.2 修改 `web/src/App.scss`——给 `.unihub-layout` 添加 `box-sizing: border-box`，确保 padding 计入 height
- [x] 1.3 修改 `web/src/App.scss`——将 `.unihub-sidebar` 的 `overflow-y: auto` 改为 `overflow: hidden`，侧边栏不再独立滚动
- [x] 1.4 构建前端并验证——运行 `make frontend` 构建前端产物，在浏览器中验证页面无全页滚动条、只有内容区内部滚动

## 2. Aerospike 命名空间查询后端

- [x] 2.1 在 `internal/service/datasource.go` 中新增 `QueryAerospikeNamespaces(host string, port int) ([]string, error)` 方法——使用 Aerospike Go 客户端创建临时连接，执行 `RequestInfo("namespaces")` 获取命名空间列表，解析响应后关闭连接
- [x] 2.2 在 `internal/handler/datasource.go` 中新增 `QueryAerospikeNamespaces` handler 方法——解析请求 body 中的 `host` 和 `port`，调用 service 方法，返回 `{ "namespaces": [...] }`
- [x] 2.3 在 `main.go` 中注册新路由 `POST /api/v1/datasources/aerospike/namespaces`——注意确保该路由在 `/{name}` 通配路由之前注册
- [x] 2.4 后端单元测试——手动测试端点：发送 POST 请求到 `/api/v1/datasources/aerospike/namespaces`，验证正常响应和错误响应（连接失败、参数缺失）

## 3. Aerospike 命名空间查询前端

- [x] 3.1 在 `web/src/api/index.ts` 中新增 `datasourceApi.queryAerospikeNamespaces(host: string, port: number)` API 函数
- [x] 3.2 修改 `web/src/pages/DatasourcePage.tsx`——当选中 Aerospike 实现时，监听 host 和 port 字段变化：两个字段均有值时，防抖 500ms 后自动调用查询 API，将 namespace 字段切换为 `<Select>` 下拉选择器并加载命名空间列表
- [x] 3.3 处理命名空间自动查询的异常情况——查询失败时 Select 支持手动输入（降级为当前行为）、host/port 变化时清除旧列表并重新查询、编辑模式下预选已保存的命名空间
- [x] 3.4 构建前端并验证——运行 `make frontend`，在浏览器中创建 Aerospike 数据源，验证命名空间自动查询功能正常，以及降级和错误处理正确
