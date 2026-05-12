package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/solo-kingdom/unihub/internal/model"
	"github.com/solo-kingdom/unihub/internal/store"
)

// DatasourceService 数据源管理业务逻辑
type DatasourceService struct {
	meta    *store.MetadataStore
	manager *store.Manager
}

// NewDatasourceService 创建数据源服务
func NewDatasourceService(meta *store.MetadataStore, manager *store.Manager) *DatasourceService {
	return &DatasourceService{
		meta:    meta,
		manager: manager,
	}
}

// List 列出所有数据源，支持可选的 typeId 和 implId 过滤
func (s *DatasourceService) List(typeID, implID string) ([]*model.Datasource, error) {
	all, err := s.meta.List()
	if err != nil {
		return nil, err
	}

	// 服务层内存过滤
	if typeID == "" && implID == "" {
		return all, nil
	}

	var filtered []*model.Datasource
	for _, ds := range all {
		if typeID != "" && ds.TypeID != typeID {
			continue
		}
		if implID != "" && ds.ImplID != implID {
			continue
		}
		filtered = append(filtered, ds)
	}
	return filtered, nil
}

// Get 获取单个数据源
func (s *DatasourceService) Get(name string) (*model.Datasource, error) {
	return s.meta.Get(name)
}

// Create 创建数据源
func (s *DatasourceService) Create(req *model.CreateDatasourceRequest) (*model.Datasource, error) {
	if req.Name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if !model.IsValidTypeImplementation(req.TypeID, req.ImplID) {
		return nil, fmt.Errorf("unsupported datasource type/implementation: %s/%s", req.TypeID, req.ImplID)
	}
	if req.Config == nil {
		return nil, fmt.Errorf("config is required")
	}

	ds := &model.Datasource{
		ID:        uuid.New().String(),
		Name:      req.Name,
		TypeID:    req.TypeID,
		ImplID:    req.ImplID,
		Config:    req.Config,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := s.meta.Create(ds); err != nil {
		return nil, err
	}

	return ds, nil
}

// Update 更新数据源
func (s *DatasourceService) Update(name string, req *model.UpdateDatasourceRequest) (*model.Datasource, error) {
	ds, err := s.meta.Get(name)
	if err != nil {
		return nil, err
	}

	// 关闭旧连接
	_ = s.manager.Remove(name)

	ds.Config = req.Config
	ds.UpdatedAt = time.Now()

	if err := s.meta.Update(ds); err != nil {
		return nil, err
	}

	return ds, nil
}

// Delete 删除数据源
func (s *DatasourceService) Delete(name string) error {
	// 关闭连接
	_ = s.manager.Remove(name)

	return s.meta.Delete(name)
}

// TestConnection 测试数据源连接
func (s *DatasourceService) TestConnection(name string) (*model.DatasourceTestResult, error) {
	return s.manager.TestConnection(name)
}

// TestNewConnection 测试新数据源连接
func (s *DatasourceService) TestNewConnection(implID string, config map[string]string) (*model.DatasourceTestResult, error) {
	return s.manager.TestNewConnection(implID, config)
}

// ListTypes 列出支持的数据源类型（含实现列表）
func (s *DatasourceService) ListTypes() []model.TypeWithImplementations {
	var result []model.TypeWithImplementations
	for _, t := range model.SupportedTypes {
		result = append(result, model.TypeWithImplementations{
			ID:              t.ID,
			Name:            t.Name,
			Interface:       t.Interface,
			Implementations: model.GetImplementationsByType(t.ID),
		})
	}
	return result
}
