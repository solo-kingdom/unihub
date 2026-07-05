## ADDED Requirements

### Requirement: 数据源类型与实现分离注册
系统 SHALL 维护一个两层注册模型：「类型」定义 uniface 接口类别（如 `kv.Storage`、`config.Storage`），「实现」定义该接口的具体后端（如 Redis、BoltDB、Consul）。注册表以单文件硬编码方式维护，手动同步 uniface 更新。

#### Scenario: 类型与实现的关联关系
- **WHEN** 查询系统支持的类型列表
- **THEN** 返回每个类型的 ID、名称、对应 uniface 接口名称，及其下所有可用实现（含 ID、名称、配置字段定义）

#### Scenario: 实现归属类型
- **WHEN** 查询某个类型的实现列表
- **THEN** 仅返回该类型下的实现，不包含其他类型的实现（如 `kv` 类型下不出现 consul）

### Requirement: 配置字段挂载于实现层
系统 SHALL 将数据源的连接配置字段定义 (`ConfigField`) 挂载在「实现」级别，每个实现拥有独立的配置字段列表（名称、标签、类型、是否必填、默认值、占位符）。

#### Scenario: Redis 实现的配置字段
- **WHEN** 选择实现为 `redis`
- **THEN** 配置表单包含连接地址 (`addr`)、密码 (`password`)、数据库编号 (`db`) 三个字段，其中连接地址为必填

#### Scenario: BoltDB 实现的配置字段
- **WHEN** 选择实现为 `boltdb`
- **THEN** 配置表单仅包含数据库文件路径 (`path`) 一个必填字段

### Requirement: 实现有效性校验
系统 SHALL 在创建数据源时校验 `implId` 是否在注册表的受支持实现列表中，且该实现归属的 `typeId` 与请求中的一致。

#### Scenario: 合法的类型与实现组合
- **WHEN** 创建数据源请求中 `typeId=kv` 且 `implId=redis`
- **THEN** 校验通过，数据源创建成功

#### Scenario: 非法的类型与实现组合
- **WHEN** 创建数据源请求中 `typeId=config` 但 `implId=redis`
- **THEN** 返回 400 Bad Request，提示实现不属于该类型

#### Scenario: 不支持的实现
- **WHEN** 创建数据源请求中 `implId=unknown`
- **THEN** 返回 400 Bad Request，提示实现不支持
