package model

import "time"

// DatasourceType 定义数据源类型
type DatasourceType string

const (
	TypeKVRedis      DatasourceType = "kv-redis"
	TypeKVBoltDB     DatasourceType = "kv-boltdb"
	TypeKVAerospike  DatasourceType = "kv-aerospike"
	TypeConfigConsul DatasourceType = "config-consul"
)

// DatasourceCategory 定义数据源大类
type DatasourceCategory string

const (
	CategoryKV     DatasourceCategory = "kv"
	CategoryConfig DatasourceCategory = "config"
)

// DatasourceTypeMeta 数据源类型元信息
type DatasourceTypeMeta struct {
	Type         DatasourceType     `json:"type"`
	Name         string             `json:"name"`
	Category     DatasourceCategory `json:"category"`
	Capabilities []string           `json:"capabilities"` // read, write, watch, list
	ConfigFields []ConfigField      `json:"configFields"`
}

// ConfigField 数据源配置字段定义
type ConfigField struct {
	Name        string `json:"name"`
	Label       string `json:"label"`
	Type        string `json:"type"` // text, number, password
	Required    bool   `json:"required"`
	Default     string `json:"default,omitempty"`
	Placeholder string `json:"placeholder,omitempty"`
}

// Datasource 数据源模型
type Datasource struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Type      DatasourceType    `json:"type"`
	Config    map[string]string `json:"config"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

// CreateDatasourceRequest 创建数据源请求
type CreateDatasourceRequest struct {
	Name   string            `json:"name" binding:"required"`
	Type   DatasourceType    `json:"type" binding:"required"`
	Config map[string]string `json:"config" binding:"required"`
}

// UpdateDatasourceRequest 更新数据源请求
type UpdateDatasourceRequest struct {
	Config map[string]string `json:"config" binding:"required"`
}

// DatasourceTestResult 连接测试结果
type DatasourceTestResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}
