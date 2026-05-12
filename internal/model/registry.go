package model

// Type 定义数据源的抽象类型（对应 uniface 接口类别）
type Type struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Interface string `json:"interface"` // 对应的 uniface 接口名称
}

// Implementation 定义数据源的具体实现
type Implementation struct {
	ID           string        `json:"id"`
	TypeID       string        `json:"typeId"`
	Name         string        `json:"name"`
	Capabilities []string      `json:"capabilities"`
	ConfigFields []ConfigField `json:"configFields"`
}

// SupportedTypes 所有支持的数据源类型
var SupportedTypes = []Type{
	{ID: "kv", Name: "KV 存储", Interface: "kv.Storage"},
	{ID: "config", Name: "配置中心", Interface: "config.Storage"},
}

// SupportedImplementations 所有支持的数据源实现
var SupportedImplementations = []Implementation{
	{
		ID:           "redis",
		TypeID:       "kv",
		Name:         "Redis",
		Capabilities: []string{"read", "write", "list", "delete"},
		ConfigFields: []ConfigField{
			{Name: "addr", Label: "连接地址", Type: "text", Required: true, Default: "localhost:6379", Placeholder: "host:port"},
			{Name: "password", Label: "密码", Type: "password", Required: false},
			{Name: "db", Label: "数据库编号", Type: "number", Required: false, Default: "0"},
		},
	},
	{
		ID:           "boltdb",
		TypeID:       "kv",
		Name:         "BoltDB",
		Capabilities: []string{"read", "write", "list", "delete"},
		ConfigFields: []ConfigField{
			{Name: "path", Label: "数据库文件路径", Type: "text", Required: true, Default: "data/bolt.db", Placeholder: "/path/to/database.db"},
		},
	},
	{
		ID:           "aerospike",
		TypeID:       "kv",
		Name:         "Aerospike",
		Capabilities: []string{"read", "write", "list", "delete"},
		ConfigFields: []ConfigField{
			{Name: "host", Label: "主机地址", Type: "text", Required: true, Default: "localhost"},
			{Name: "port", Label: "端口", Type: "number", Required: true, Default: "3000"},
			{Name: "namespace", Label: "命名空间", Type: "text", Required: true, Default: "test"},
			{Name: "set", Label: "Set 名称", Type: "text", Required: false},
		},
	},
	{
		ID:           "consul",
		TypeID:       "config",
		Name:         "Consul",
		Capabilities: []string{"read", "write", "list", "delete", "watch"},
		ConfigFields: []ConfigField{
			{Name: "address", Label: "Consul 地址", Type: "text", Required: true, Default: "localhost:8500"},
			{Name: "token", Label: "ACL Token", Type: "password", Required: false},
			{Name: "datacenter", Label: "数据中心", Type: "text", Required: false},
		},
	},
}

// GetType 按 ID 获取类型
func GetType(typeID string) (Type, bool) {
	for _, t := range SupportedTypes {
		if t.ID == typeID {
			return t, true
		}
	}
	return Type{}, false
}

// GetImplementation 按 ID 获取实现
func GetImplementation(implID string) (Implementation, bool) {
	for _, impl := range SupportedImplementations {
		if impl.ID == implID {
			return impl, true
		}
	}
	return Implementation{}, false
}

// GetImplementationsByType 获取指定类型下的所有实现
func GetImplementationsByType(typeID string) []Implementation {
	var result []Implementation
	for _, impl := range SupportedImplementations {
		if impl.TypeID == typeID {
			result = append(result, impl)
		}
	}
	return result
}

// IsValidTypeImplementation 校验 typeId + implId 组合是否合法
func IsValidTypeImplementation(typeID, implID string) bool {
	impl, ok := GetImplementation(implID)
	if !ok {
		return false
	}
	return impl.TypeID == typeID
}
