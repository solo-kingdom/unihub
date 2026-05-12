## Context

UniHub 的数据源管理和数据查询功能存在两个问题：(1) 编辑表单使用 `setTimeout(0)` hack 回显配置字段，在 React 18 自动批处理下不可靠；(2) 数据查询只能列出全部 key 后手动翻找，缺少搜索和随机获取能力。

当前架构中，`DatasourcePage` 在编辑 Modal 中使用两个独立的 `<Form>` 组件（共享同一个 `form` 实例），config 字段的动态渲染依赖于 `currentImplMeta` 状态。`handleOpenEdit` 通过 `setTimeout(0)` 延迟设置 config 值，期望 React 在回调执行前完成重渲染——这本质上是竞态条件。

数据查询方面，`kv.Storage` 接口仅暴露 `List()`（返回全部 key），没有 pattern 过滤或随机获取能力。目前前端 `DataQueryPage` 仅展示全部 key 列表供手动浏览。

## Goals / Non-Goals

**Goals:**
- 修复编辑表单配置字段回显 Bug，用声明式 React 模式替代 `setTimeout(0)` hack
- 新增 key 模式搜索（glob 风格，如 `user:*`）——后端支持 `pattern` 参数，前端支持实时过滤
- 新增随机 key 获取功能，从数据源中随机选取一个 key
- 新增 key 存在性检查（`HEAD` 端点），用于前端重复 key 检测
- 所有新增功能不破坏现有 API 和行为

**Non-Goals:**
- 不修改 `uniface` 依赖库的 `kv.Storage` 接口
- 不实现后端原生命令（如 Redis `KEYS`、`RANDOMKEY`）的直接透传——保持抽象一致性
- 不处理 Aerospike 等后端 `List` 不支持的问题（属于已知限制）
- 不支持正则表达式 key 搜索——仅 glob 模式

## Decisions

### D1: 编辑表单重构 —— 合并为单个 Form

**选择：** 将两个分离的 `<Form>` 合并为单个 `<Form>`，所有字段（身份 + 动态 config）在同一 Form 上下文内。

**替代方案及排除理由：**
- ~~方案 B: 保留两个 Form + `useEffect` 延迟回显~~ — 仍有时序依赖，且两个 Form 共享实例令人困惑
- ~~方案 C: `Form.initialValues`~~ — config 字段在 Modal 打开时尚未渲染，Ant Design 的 `initialValues` 对动态字段不起作用
- ~~方案 D: `Form.useWatch` 监听渲染时机~~ — 过度设计，本质仍是绕圈子

**实现方式：**
```
Modal (destroyOnClose)
  └── <Form form={form}>
        ├── <Form.Item name="name">         ← 身份字段
        ├── <Form.Item name="typeId">
        ├── <Form.Item name="implId">
        ├── {implMeta && implMeta.configFields.map(field =>
        │     <Form.Item name={`config_${field.name}`}>  ← 动态 config 字段
        │   )}
        └── <Button>测试连接</Button>
      </Form>
```

打开编辑时，使用 `form.setFieldsValue({...所有字段...})` 一次性设置。由于所有字段在同一个 Form 上下文中，Ant Design 内部会处理尚未挂载字段的值缓存——当 config 字段随后渲染时自动从缓存中读取。这利用了 Ant Design Form 的 `fields` 内部注册机制。

**关键点：** Modal 的 `destroyOnClose` 需要保留以在关闭时清除状态。打开编辑时先设置 `selectedTypeId` 和 `selectedImplId`（触发 config 字段渲染），然后用 `form.setFieldsValue` 一次性设置所有值。

### D2: Key 搜索 —— 服务端 + 客户端双路径

**选择：** 后端扩展现有 `GET /keys` 端点增加可选 `pattern` 查询参数；前端实现客户端实时过滤（加载全部 key 后在前端搜索）+ 服务端搜索能力供未来优化。

**替代方案：**
- ~~方案 A: 纯客户端过滤~~ — 简单但对大量 key 的数据源性能差
- ~~方案 B: 纯服务端搜索~~ — 每次按键都发请求，延迟高且浪费网络

**API 设计：**
```
GET /api/v1/datasources/{name}/keys?pattern=user:*
```
- `pattern` 参数可选，使用 glob 风格（`*` 匹配任意字符序列，`?` 匹配单个字符）
- 不传 `pattern` 或 `pattern=""` 时行为不变：返回全部 key
- 后端在 `List()` 返回的全部 key 上做内存过滤（`filepath.Match` 或简单通配符匹配）
- 服务端过滤减少网络传输量，对远程数据源尤其重要

**前端实现：**
- 在 key 列表上方添加搜索输入框
- 输入时：先尝试客户端过滤已加载的 key 列表（即时反馈）
- 防抖 300ms 后发送带 `pattern` 参数的服务端请求
- 搜索输入框带清除按钮，清除后恢复全部 key 列表

### D3: 随机 Key —— 独立端点

**选择：** 新增 `GET /api/v1/datasources/{name}/keys/random` 端点，返回一个随机 key 名称。前端自动选中该 key 触发值加载。

**替代方案：**
- ~~方案 A: 在 data 端点加 `random=true` 返回 key+value~~ — 语义混乱，`/data` 应该按 key 查询
- ~~方案 B: 前端从全部 key 列表中随机选~~ — 需要先加载全部 key（可能成千上万），浪费

**实现：**
```
GET /api/v1/datasources/{name}/keys/random
→ 200 { "key": "random-key-name" }
→ 404 如果数据源没有任何 key
```
- 后端调用 `List()` 获取全部 key，使用 `math/rand` 随机选取
- 前端收到 key 后自动调用 `handleSelectKey(randomKey)` 触发值加载
- UI 上添加「🎲 随机」按钮在 key 列表面板头部

### D4: Key 存在性检查 —— HEAD 端点

**选择：** 新增 `HEAD /api/v1/datasources/{name}/data?key=xxx` 端点。

- 返回 `200` 如果 key 存在，`404` 如果不存在
- 使用 `kv.Storage.Exists()` 方法（接口已支持）
- 前端在「新增键值」Modal 中使用，输入 key 名时触发去重检测（防抖 500ms），提示 key 已存在

### D5: 前端编辑 Modal 关闭时 key 清除

当前 `handleSelectDs` 切换到新数据源时会清除 `selectedKey` 和 `keyValue`，但搜索输入框不清除。新增搜索输入框需要在切换数据源时一并清空。

## Risks / Trade-offs

- **[Risk] 编辑回显方案对 Ant Design Form 内部缓存机制的依赖:** `form.setFieldsValue` 对尚未渲染的字段的处理依赖于 Ant Design 的内部实现。 → **Mitigation:** 测试确认 Ant Design Form 确实缓存未渲染字段的值（经验证：Form 实例维护内部 `store`，`setFieldsValue` 写入 store，字段渲染时从 store 读取——这是 Ant Design 的保证行为）。并在 Modal 的 `afterOpenChange` 回调中设置值作为备选。

- **[Risk] 服务端 pattern 过滤对大 key 集的性能:** Redis/BoltDB 可能有百万级 key，`List()` 加载全部再过滤会很慢。 → **Mitigation:** 当前面向管理控制台场景，key 数量级通常在千级别。未来如需优化可对 Redis 后端做 `SCAN pattern` 的类型断言优化，但不在本次范围内。

- **[Risk] 随机 key 需要全量 key 列表:** `math/rand` 从切片中随机选需要知道总长度。 → **Mitigation:** 复用当前的 `List()` 调用（连接已缓存），随机选取的开销是 O(1) 内存操作。如果 key 列表已在前端缓存则直接前端随机，减少一次 API 调用。

- **[Trade-off] Glob vs Regex:** Glob 模式（`*`、`?`）比正则简单但表达能力弱。 → 对于 key 名搜索，glob 足够；正则反而增加用户学习成本和输入错误概率。
