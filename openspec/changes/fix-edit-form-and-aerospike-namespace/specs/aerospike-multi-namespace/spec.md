## ADDED Requirements

### Requirement: 多 namespace 配置支持
系统 SHALL 允许 Aerospike 数据源的 `namespace` 配置字段存储逗号分隔的多个 namespace 名称（如 `"test,prod,staging"`），并为每个非空 namespace 创建独立的连接 Instance。

#### Scenario: 配置单个 namespace
- **WHEN** 创建或编辑 Aerospike 数据源，config 中 `namespace` 字段值为 `"test"`（无逗号的单值）
- **THEN** 系统解析为一个 namespace，创建一个 Instance 连接到该 namespace

#### Scenario: 配置多个 namespace
- **WHEN** 创建或编辑 Aerospike 数据源，config 中 `namespace` 字段值为 `"test,prod,staging"`
- **THEN** 系统解析为三个 namespace（`test`、`prod`、`staging`），各创建一个 Instance

#### Scenario: namespace 值包含空白
- **WHEN** config 中 `namespace` 字段值为 `"test, prod , staging"`
- **THEN** 系统 trim 每个值后得到 `test`、`prod`、`staging`，创建三个 Instance

#### Scenario: 空 namespace 被忽略
- **WHEN** config 中 `namespace` 字段值为 `"test,,prod"`（含空段）
- **THEN** 系统仅创建 `test` 和 `prod` 的 Instance，忽略空段

#### Scenario: 兼容已有单值配置
- **WHEN** 系统中已有旧版本的 Aerospike 数据源，其 `namespace` 值为单个 namespace 名称（如 `"test"`）
- **THEN** 系统正常解析为单一 Instance，无破坏性变更

### Requirement: 多 namespace Instance 创建
系统 SHALL 在 `createAerospikeStorage` 中为每个 namespace 创建带有唯一 ID 的 `aerospike.Instance`，所有 Instance 共享相同的 host/port/set 配置。

#### Scenario: 多 Instance 共享配置
- **WHEN** config 中 `host="10.0.0.1"`、`port="3000"`、`namespace="a,b"`、`set="users"`
- **THEN** 系统创建两个 Instance，各自的 ID 为 `"ns-0"` 和 `"ns-1"`，Host/Port 均为 `10.0.0.1:3000`，Set 均为 `users`
