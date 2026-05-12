package service

import (
	"context"
	"fmt"

	"github.com/solo-kingdom/unihub/internal/store"
)

// DataService 数据读写业务逻辑
type DataService struct {
	manager *store.Manager
}

// NewDataService 创建数据服务
func NewDataService(manager *store.Manager) *DataService {
	return &DataService{
		manager: manager,
	}
}

// Get 从指定数据源读取数据
func (s *DataService) Get(ctx context.Context, dsName string, key string) (interface{}, error) {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return nil, fmt.Errorf("get storage: %w", err)
	}

	var value interface{}
	if err := storage.Get(ctx, key, &value); err != nil {
		return nil, fmt.Errorf("get value: %w", err)
	}

	return value, nil
}

// Set 向指定数据源写入数据
func (s *DataService) Set(ctx context.Context, dsName string, key string, value interface{}) error {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return fmt.Errorf("get storage: %w", err)
	}

	if err := storage.Set(ctx, key, value); err != nil {
		return fmt.Errorf("set value: %w", err)
	}

	return nil
}

// Delete 从指定数据源删除数据
func (s *DataService) Delete(ctx context.Context, dsName string, key string) error {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return fmt.Errorf("get storage: %w", err)
	}

	if err := storage.Delete(ctx, key); err != nil {
		return fmt.Errorf("delete value: %w", err)
	}

	return nil
}

// List 列出指定数据源的所有键
func (s *DataService) List(ctx context.Context, dsName string) ([]string, error) {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return nil, fmt.Errorf("get storage: %w", err)
	}

	keys, err := storage.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list keys: %w", err)
	}

	return keys, nil
}
