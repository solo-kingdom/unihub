package model

// SupportedDatasourceTypes 返回所有支持的数据源类型及其元信息
func SupportedDatasourceTypes() []DatasourceTypeMeta {
	return []DatasourceTypeMeta{
		{
			Type:         TypeKVRedis,
			Name:         "Redis",
			Category:     CategoryKV,
			Capabilities: []string{"read", "write", "list", "delete"},
			ConfigFields: []ConfigField{
				{Name: "addr", Label: "连接地址", Type: "text", Required: true, Default: "localhost:6379", Placeholder: "host:port"},
				{Name: "password", Label: "密码", Type: "password", Required: false},
				{Name: "db", Label: "数据库编号", Type: "number", Required: false, Default: "0"},
			},
		},
		{
			Type:         TypeKVBoltDB,
			Name:         "BoltDB",
			Category:     CategoryKV,
			Capabilities: []string{"read", "write", "list", "delete"},
			ConfigFields: []ConfigField{
				{Name: "path", Label: "数据库文件路径", Type: "text", Required: true, Default: "data/bolt.db", Placeholder: "/path/to/database.db"},
			},
		},
		{
			Type:         TypeKVAerospike,
			Name:         "Aerospike",
			Category:     CategoryKV,
			Capabilities: []string{"read", "write", "list", "delete"},
			ConfigFields: []ConfigField{
				{Name: "host", Label: "主机地址", Type: "text", Required: true, Default: "localhost"},
				{Name: "port", Label: "端口", Type: "number", Required: true, Default: "3000"},
				{Name: "namespace", Label: "命名空间", Type: "text", Required: true, Default: "test"},
				{Name: "set", Label: "Set 名称", Type: "text", Required: false},
			},
		},
		{
			Type:         TypeConfigConsul,
			Name:         "Consul",
			Category:     CategoryConfig,
			Capabilities: []string{"read", "write", "list", "delete", "watch"},
			ConfigFields: []ConfigField{
				{Name: "address", Label: "Consul 地址", Type: "text", Required: true, Default: "localhost:8500"},
				{Name: "token", Label: "ACL Token", Type: "password", Required: false},
				{Name: "datacenter", Label: "数据中心", Type: "text", Required: false},
			},
		},
	}
}

// IsSupportedType 检查数据源类型是否受支持
func IsSupportedType(t DatasourceType) bool {
	for _, ds := range SupportedDatasourceTypes() {
		if ds.Type == t {
			return true
		}
	}
	return false
}

// GetDatasourceTypeMeta 获取指定类型的元信息
func GetDatasourceTypeMeta(t DatasourceType) (DatasourceTypeMeta, bool) {
	for _, ds := range SupportedDatasourceTypes() {
		if ds.Type == t {
			return ds, true
		}
	}
	return DatasourceTypeMeta{}, false
}
