package service

import (
	"context"
	"fmt"
	"math/rand"
	"path"

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
	return s.ListKeys(ctx, dsName, "")
}

// ListKeys 列出指定数据源的键，支持 pattern 过滤
// pattern 使用 glob 风格（如 "user:*"），为空时返回全部键
func (s *DataService) ListKeys(ctx context.Context, dsName string, pattern string) ([]string, error) {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return nil, fmt.Errorf("get storage: %w", err)
	}

	keys, err := storage.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list keys: %w", err)
	}

	if pattern == "" {
		return keys, nil
	}

	// Filter keys matching glob pattern
	filtered := make([]string, 0, len(keys))
	for _, key := range keys {
		if matchPattern(pattern, key) {
			filtered = append(filtered, key)
		}
	}
	return filtered, nil
}

// matchPattern 使用 path.Match 进行 glob 风格的模式匹配
func matchPattern(pattern, key string) bool {
	matched, err := path.Match(pattern, key)
	if err != nil {
		return false
	}
	return matched
}

// RandomKey 从指定数据源中随机返回一个键名
func (s *DataService) RandomKey(ctx context.Context, dsName string) (string, error) {
	keys, err := s.List(ctx, dsName)
	if err != nil {
		return "", fmt.Errorf("list keys: %w", err)
	}

	if len(keys) == 0 {
		return "", fmt.Errorf("no keys available in datasource %s", dsName)
	}

	idx := rand.Intn(len(keys))
	return keys[idx], nil
}

// Exists 检查指定键是否存在于数据源中
func (s *DataService) Exists(ctx context.Context, dsName string, key string) (bool, error) {
	storage, err := s.manager.GetStorage(dsName)
	if err != nil {
		return false, fmt.Errorf("get storage: %w", err)
	}

	return storage.Exists(ctx, key)
}
