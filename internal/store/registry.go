package store

import (
	"context"
	"fmt"
	"strconv"

	"github.com/solo-kingdom/uniface/pkg/storage/kv"
	"github.com/solo-kingdom/uniface/pkg/storage/kv/aerospike"
	"github.com/solo-kingdom/uniface/pkg/storage/kv/boltdb"
	"github.com/solo-kingdom/uniface/pkg/storage/kv/redis"
	"github.com/solo-kingdom/unihub/internal/model"
)

// KVStorage 是 uniface kv.Storage 接口的别名
type KVStorage = kv.Storage

// CreateKVStorage 根据数据源类型和配置创建对应的 KV Storage 实例
func CreateKVStorage(dsType model.DatasourceType, config map[string]string) (KVStorage, error) {
	switch dsType {
	case model.TypeKVRedis:
		return createRedisStorage(config)
	case model.TypeKVBoltDB:
		return createBoltDBStorage(config)
	case model.TypeKVAerospike:
		return createAerospikeStorage(config)
	default:
		return nil, fmt.Errorf("unsupported datasource type: %s", dsType)
	}
}

func createRedisStorage(config map[string]string) (KVStorage, error) {
	var opts []redis.Option

	if addr, ok := config["addr"]; ok && addr != "" {
		opts = append(opts, redis.WithAddr(addr))
	}
	if password, ok := config["password"]; ok {
		opts = append(opts, redis.WithPassword(password))
	}
	if dbStr, ok := config["db"]; ok && dbStr != "" {
		db, err := strconv.Atoi(dbStr)
		if err != nil {
			return nil, fmt.Errorf("invalid db number: %w", err)
		}
		opts = append(opts, redis.WithDB(db))
	}

	return redis.New(opts...)
}

func createBoltDBStorage(config map[string]string) (KVStorage, error) {
	var opts []boltdb.Option

	if path, ok := config["path"]; ok && path != "" {
		opts = append(opts, boltdb.WithPath(path))
	}

	return boltdb.New(opts...)
}

func createAerospikeStorage(config map[string]string) (KVStorage, error) {
	host := config["host"]
	if host == "" {
		host = "localhost"
	}
	port := 3000
	if portStr, ok := config["port"]; ok && portStr != "" {
		var err error
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("invalid port: %w", err)
		}
	}
	namespace := config["namespace"]
	if namespace == "" {
		namespace = "test"
	}
	setName := config["set"]

	instances := []*aerospike.Instance{
		{
			ID:        "default",
			Host:      host,
			Port:      port,
			Namespace: namespace,
			Set:       setName,
		},
	}

	asStorage, err := aerospike.NewStorage(instances)
	if err != nil {
		return nil, err
	}
	return &aerospikeAdapter{Storage: asStorage}, nil
}

// TestConnection 测试数据源连接
func TestConnection(dsType model.DatasourceType, config map[string]string) (*model.DatasourceTestResult, error) {
	switch dsType {
	case model.TypeKVRedis, model.TypeKVBoltDB, model.TypeKVAerospike:
		storage, err := CreateKVStorage(dsType, config)
		if err != nil {
			return &model.DatasourceTestResult{
				Success: false,
				Message: fmt.Sprintf("连接失败: %v", err),
			}, nil
		}
		defer storage.Close()

		// 尝试一个简单的操作来验证连接
		ctx := context.Background()
		testKey := "__unihub_connection_test__"
		err = storage.Set(ctx, testKey, "ok")
		if err != nil {
			return &model.DatasourceTestResult{
				Success: false,
				Message: fmt.Sprintf("写入测试失败: %v", err),
			}, nil
		}

		var val string
		err = storage.Get(ctx, testKey, &val)
		if err != nil {
			return &model.DatasourceTestResult{
				Success: false,
				Message: fmt.Sprintf("读取测试失败: %v", err),
			}, nil
		}

		// 清理测试数据
		_ = storage.Delete(ctx, testKey)

		return &model.DatasourceTestResult{
			Success: true,
			Message: "连接成功",
		}, nil

	case model.TypeConfigConsul:
		return &model.DatasourceTestResult{
			Success: false,
			Message: "Consul 配置中心连接测试暂未实现",
		}, nil

	default:
		return nil, fmt.Errorf("unsupported datasource type: %s", dsType)
	}
}

// aerospikeAdapter 适配 aerospike.Storage 到 kv.Storage 接口
// aerospike 的部分方法签名与 kv.Storage 接口不同（缺少 ...kv.Option 参数）
type aerospikeAdapter struct {
	*aerospike.Storage
}

func (a *aerospikeAdapter) Get(ctx context.Context, key string, value interface{}, _ ...kv.Option) error {
	return a.Storage.Get(ctx, key, value)
}

func (a *aerospikeAdapter) Delete(ctx context.Context, key string, _ ...kv.Option) error {
	return a.Storage.Delete(ctx, key)
}

func (a *aerospikeAdapter) Exists(ctx context.Context, key string, _ ...kv.Option) (bool, error) {
	return a.Storage.Exists(ctx, key)
}

func (a *aerospikeAdapter) List(_ context.Context, _ ...kv.Option) ([]string, error) {
	return nil, fmt.Errorf("list operation is not supported by aerospike")
}

func (a *aerospikeAdapter) BatchSet(_ context.Context, _ map[string]interface{}, _ ...kv.Option) error {
	return aerospike.ErrBatchNotSupported
}

func (a *aerospikeAdapter) BatchGet(_ context.Context, _ []string, _ ...kv.Option) (map[string]interface{}, error) {
	return nil, aerospike.ErrBatchNotSupported
}

func (a *aerospikeAdapter) BatchDelete(_ context.Context, _ []string, _ ...kv.Option) error {
	return aerospike.ErrBatchNotSupported
}
