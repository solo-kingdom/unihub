## ADDED Requirements

### Requirement: 数据源类型定义
系统 SHALL 支持以下数据源类型：`kv-redis`（Redis KV 存储）、`kv-boltdb`（BoltDB KV 存储）、`kv-aerospike`（Aerospike KV 存储）、`config-consul`（Consul 配置中心）。每种类型对应 uniface 的一个具体实现。

#### Scenario: 列出支持的数据源类型
- **WHEN** 查询系统支持的数据源类型列表
- **THEN** 返回所有支持的类型及其描述信息，包括类型标识、名称、支持的接口能力（读/写/监听）

### Requirement: 数据源注册
系统 SHALL 允许通过 API 注册新的数据源实例，提供名称、类型标识和连接配置参数。

#### Scenario: 注册 Redis 数据源
- **WHEN** 提交数据源注册请求，类型为 `kv-redis`，包含名称 `my-redis` 和连接地址 `localhost:6379`
- **THEN** 系统创建数据源记录，返回数据源 ID 和配置信息

#### Scenario: 注册重复名称数据源
- **WHEN** 提交数据源注册请求，名称与已有数据源重复
- **THEN** 系统返回 409 Conflict 错误，提示名称已存在

#### Scenario: 注册不支持的数据源类型
- **WHEN** 提交数据源注册请求，类型标识不在支持列表中
- **THEN** 系统返回 400 Bad Request 错误，提示类型不支持

### Requirement: 数据源配置存储
系统 SHALL 使用 BoltDB 作为本地元数据存储，持久化数据源的注册信息（名称、类型、连接参数）。

#### Scenario: 数据源配置持久化
- **WHEN** 注册一个新数据源后重启系统
- **THEN** 系统启动后自动从 BoltDB 加载所有已注册的数据源配置

### Requirement: 数据源连接管理
系统 SHALL 按需创建数据源连接实例，并缓存已创建的连接供后续使用。

#### Scenario: 首次访问数据源
- **WHEN** 对某个已注册的数据源首次执行数据操作
- **THEN** 系统根据数据源类型和配置创建对应的 uniface Storage 实例，缓存连接

#### Scenario: 数据源连接测试
- **WHEN** 对某个已注册的数据源执行连接测试
- **THEN** 系统尝试创建连接并执行简单操作（如 Ping），返回连接成功或失败信息

### Requirement: 数据源列表查询
系统 SHALL 支持查询所有已注册的数据源列表，返回每个数据源的基本信息（ID、名称、类型、状态）。

#### Scenario: 查询数据源列表
- **WHEN** 请求获取所有数据源列表
- **THEN** 返回所有已注册数据源的信息数组，按注册时间排序

### Requirement: 数据源更新
系统 SHALL 支持更新已注册数据源的配置参数，更新时自动关闭旧连接。

#### Scenario: 更新数据源连接地址
- **WHEN** 修改某个数据源的连接地址参数
- **THEN** 系统关闭该数据源的旧连接实例，更新配置，下次访问时使用新配置创建连接

### Requirement: 数据源删除
系统 SHALL 支持删除已注册的数据源，删除前自动关闭连接并移除配置。

#### Scenario: 删除数据源
- **WHEN** 删除某个已注册的数据源
- **THEN** 系统关闭该数据源的连接实例，从 BoltDB 中移除配置记录，返回成功

#### Scenario: 删除不存在的数据源
- **WHEN** 尝试删除一个不存在的数据源
- **THEN** 系统返回 404 Not Found 错误
