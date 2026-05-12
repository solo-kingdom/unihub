package store

import (
	"fmt"
	"sync"

	"github.com/solo-kingdom/unihub/internal/model"
)

// ConnEntry 缓存的连接条目
type ConnEntry struct {
	Storage KVStorage
}

// Manager 管理数据源连接实例的缓存
type Manager struct {
	mu       sync.RWMutex
	registry *MetadataStore
	conns    sync.Map // map[string]*ConnEntry
}

// NewManager 创建连接管理器
func NewManager(registry *MetadataStore) *Manager {
	return &Manager{
		registry: registry,
	}
}

// GetStorage 获取指定数据源的存储实例（按需创建）
func (m *Manager) GetStorage(name string) (KVStorage, error) {
	// 先尝试从缓存获取
	if entry, ok := m.conns.Load(name); ok {
		return entry.(*ConnEntry).Storage, nil
	}

	// 从元数据获取数据源配置
	ds, err := m.registry.Get(name)
	if err != nil {
		return nil, fmt.Errorf("get datasource %q: %w", name, err)
	}

	// 根据实现创建存储实例
	storage, err := CreateKVStorage(ds.ImplID, ds.Config)
	if err != nil {
		return nil, fmt.Errorf("create storage for %q: %w", name, err)
	}

	// 缓存连接
	m.conns.Store(name, &ConnEntry{Storage: storage})

	return storage, nil
}

// Remove 关闭并移除指定数据源的连接
func (m *Manager) Remove(name string) error {
	if entry, ok := m.conns.LoadAndDelete(name); ok {
		return entry.(*ConnEntry).Storage.Close()
	}
	return nil
}

// CloseAll 关闭所有连接
func (m *Manager) CloseAll() error {
	var lastErr error
	m.conns.Range(func(key, value interface{}) bool {
		if err := value.(*ConnEntry).Storage.Close(); err != nil {
			lastErr = err
		}
		m.conns.Delete(key)
		return true
	})
	return lastErr
}

// TestConnection 测试指定数据源的连接
func (m *Manager) TestConnection(name string) (*model.DatasourceTestResult, error) {
	ds, err := m.registry.Get(name)
	if err != nil {
		return nil, fmt.Errorf("get datasource %q: %w", name, err)
	}
	return storeTestConnection(ds.ImplID, ds.Config)
}

// TestNewConnection 测试新数据源（尚未注册）的连接
func (m *Manager) TestNewConnection(implID string, config map[string]string) (*model.DatasourceTestResult, error) {
	return storeTestConnection(implID, config)
}

func storeTestConnection(implID string, config map[string]string) (*model.DatasourceTestResult, error) {
	return TestConnection(implID, config)
}
