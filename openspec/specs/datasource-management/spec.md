## ADDED Requirements

### Requirement: 数据源类型定义
系统 SHALL 将「类型」和「实现」分离为两层模型：类型标识 uniface 接口类别（如 `kv` 对应 `kv.Storage`、`config` 对应 `config.Storage`），实现标识该接口的具体后端（如 `redis`、`boltdb`、`aerospike` 实现 `kv.Storage`，`consul` 实现 `config.Storage`）。类型与实现的映射关系在单文件注册表中硬编码维护。

#### Scenario: 列出支持的数据源类型
- **WHEN** 查询系统支持的数据源类型列表
- **THEN** 返回所有类型及其描述信息（类型 ID、名称、对应 uniface 接口），每个类型下嵌入其支持的实现列表（含实现 ID、名称、配置字段定义、支持的能力）

### Requirement: 数据源注册
系统 SHALL 允许通过 API 注册新的数据源实例，提供名称、类型标识 (`typeId`)、实现标识 (`implId`) 和连接配置参数。

#### Scenario: 注册 Redis 数据源
- **WHEN** 提交数据源注册请求，`typeId` 为 `kv`，`implId` 为 `redis`，包含名称 `my-redis` 和连接地址 `localhost:6379`
- **THEN** 系统创建数据源记录，返回数据源 ID 和完整配置信息（含 `typeId` 和 `implId`）

#### Scenario: 注册重复名称数据源
- **WHEN** 提交数据源注册请求，名称与已有数据源重复
- **THEN** 系统返回 409 Conflict 错误，提示名称已存在

#### Scenario: 注册不支持的类型与实现组合
- **WHEN** 提交数据源注册请求，`typeId` 和 `implId` 的组合不在注册表支持列表中
- **THEN** 系统返回 400 Bad Request 错误，提示类型或实现不支持

### Requirement: 数据源配置存储
系统 SHALL 使用 BoltDB 作为本地元数据存储，持久化数据源的注册信息（名称、类型标识、实现标识、连接参数）。

#### Scenario: 数据源配置持久化
- **WHEN** 注册一个新数据源后重启系统
- **THEN** 系统启动后自动从 BoltDB 加载所有已注册的数据源配置，包含 `typeId` 和 `implId` 字段

### Requirement: 数据源连接管理
系统 SHALL 按需创建数据源连接实例，并缓存已创建的连接供后续使用。工厂函数根据实现标识 (`implId`) 创建对应的 uniface Storage 实例。

#### Scenario: 首次访问数据源
- **WHEN** 对某个已注册的数据源首次执行数据操作
- **THEN** 系统根据数据源的实现标识和配置创建对应的 uniface Storage 实例，缓存连接

#### Scenario: 数据源连接测试
- **WHEN** 对某个已注册的数据源执行连接测试
- **THEN** 系统尝试根据实现标识创建连接并执行简单操作（如写入/读取测试键），返回连接成功或失败信息

### Requirement: 数据源列表查询
系统 SHALL 支持查询所有已注册的数据源列表，返回每个数据源的基本信息（ID、名称、类型标识、实现标识、配置、创建/更新时间），支持按 `typeId` 和 `implId` 查询参数过滤。

#### Scenario: 查询数据源列表
- **WHEN** 请求获取所有数据源列表
- **THEN** 返回所有已注册数据源的信息数组，按注册时间排序，每个数据源包含 `typeId` 和 `implId`

#### Scenario: 按类型过滤数据源列表
- **WHEN** 请求获取数据源列表并携带 `typeId=kv` 查询参数
- **THEN** 仅返回类型标识为 `kv` 的数据源

#### Scenario: 按实现过滤数据源列表
- **WHEN** 请求获取数据源列表并携带 `implId=redis` 查询参数
- **THEN** 仅返回实现标识为 `redis` 的数据源

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

### Requirement: Aerospike 命名空间自动查询
系统 SHALL 在创建或编辑 Aerospike 数据源的配置表单中，当用户填写主机地址和端口后，自动查询并展示可用的命名空间列表供选择，替代手动输入命名空间名称。

#### Scenario: 自动查询并填充命名空间下拉列表
- **WHEN** 用户在新增 Aerospike 数据源的表单中填写了主机（host）和端口（port），且两个字段均不为空
- **THEN** 命名空间字段切换为 Select 下拉选择器，自动触发命名空间查询（防抖 500ms），查询完成后下拉列表显示所有可用命名空间

#### Scenario: 查询失败时降级为手动输入
- **WHEN** 命名空间自动查询失败（如服务器不可达）
- **THEN** Select 组件支持用户手动输入命名空间名称，并在字段下方显示错误提示

#### Scenario: 编辑模式下预选已保存的命名空间
- **WHEN** 编辑已存在的 Aerospike 数据源，命名空间字段已有保存的值
- **THEN** 查询完成后自动预选已保存的命名空间；如果该值不在查询结果中，仍将其作为 Select 的有效选项保留
