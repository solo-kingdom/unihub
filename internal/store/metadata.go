package store

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/solo-kingdom/unihub/internal/model"
	bolt "go.etcd.io/bbolt"
)

const (
	metadataBucket = "datasources"
	metadataDBName = "unihub-meta.db"
)

// MetadataStore 管理数据源元数据的持久化
type MetadataStore struct {
	db *bolt.DB
}

// NewMetadataStore 创建元数据存储实例
func NewMetadataStore(dbPath string) (*MetadataStore, error) {
	if dbPath == "" {
		dbPath = metadataDBName
	}
	db, err := bolt.Open(dbPath, 0600, &bolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		return nil, fmt.Errorf("open metadata db: %w", err)
	}

	err = db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(metadataBucket))
		return err
	})
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create bucket: %w", err)
	}

	return &MetadataStore{db: db}, nil
}

// Close 关闭元数据存储
func (s *MetadataStore) Close() error {
	return s.db.Close()
}

// Create 创建数据源记录
func (s *MetadataStore) Create(ds *model.Datasource) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(metadataBucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", metadataBucket)
		}

		// 检查名称唯一性
		existing := b.Get([]byte(ds.Name))
		if existing != nil {
			return fmt.Errorf("datasource with name %q already exists", ds.Name)
		}

		data, err := json.Marshal(ds)
		if err != nil {
			return fmt.Errorf("marshal datasource: %w", err)
		}

		return b.Put([]byte(ds.Name), data)
	})
}

// Get 按名称获取数据源
func (s *MetadataStore) Get(name string) (*model.Datasource, error) {
	var ds model.Datasource
	err := s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(metadataBucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", metadataBucket)
		}

		data := b.Get([]byte(name))
		if data == nil {
			return fmt.Errorf("datasource %q not found", name)
		}

		return json.Unmarshal(data, &ds)
	})
	if err != nil {
		return nil, err
	}
	return &ds, nil
}

// List 获取所有数据源
func (s *MetadataStore) List() ([]*model.Datasource, error) {
	var list []*model.Datasource
	err := s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(metadataBucket))
		if b == nil {
			return nil
		}

		return b.ForEach(func(k, v []byte) error {
			var ds model.Datasource
			if err := json.Unmarshal(v, &ds); err != nil {
				return fmt.Errorf("unmarshal datasource %s: %w", string(k), err)
			}
			list = append(list, &ds)
			return nil
		})
	})
	if err != nil {
		return nil, err
	}
	return list, nil
}

// Update 更新数据源
func (s *MetadataStore) Update(ds *model.Datasource) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(metadataBucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", metadataBucket)
		}

		existing := b.Get([]byte(ds.Name))
		if existing == nil {
			return fmt.Errorf("datasource %q not found", ds.Name)
		}

		data, err := json.Marshal(ds)
		if err != nil {
			return fmt.Errorf("marshal datasource: %w", err)
		}

		return b.Put([]byte(ds.Name), data)
	})
}

// Delete 删除数据源
func (s *MetadataStore) Delete(name string) error {
	return s.db.Update(func(tx *bolt.Tx) error {
		b := tx.Bucket([]byte(metadataBucket))
		if b == nil {
			return fmt.Errorf("bucket %s not found", metadataBucket)
		}

		existing := b.Get([]byte(name))
		if existing == nil {
			return fmt.Errorf("datasource %q not found", name)
		}

		return b.Delete([]byte(name))
	})
}
