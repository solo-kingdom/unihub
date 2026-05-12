package model

import "time"

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
	TypeID    string            `json:"typeId"`
	ImplID    string            `json:"implId"`
	Config    map[string]string `json:"config"`
	CreatedAt time.Time         `json:"createdAt"`
	UpdatedAt time.Time         `json:"updatedAt"`
}

// CreateDatasourceRequest 创建数据源请求
type CreateDatasourceRequest struct {
	Name   string            `json:"name" binding:"required"`
	TypeID string            `json:"typeId" binding:"required"`
	ImplID string            `json:"implId" binding:"required"`
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

// TypeWithImplementations 带实现列表的类型（API 响应用）
type TypeWithImplementations struct {
	ID              string           `json:"id"`
	Name            string           `json:"name"`
	Interface       string           `json:"interface"`
	Implementations []Implementation `json:"implementations"`
}
