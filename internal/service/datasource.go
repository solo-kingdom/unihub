package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	as "github.com/aerospike/aerospike-client-go/v7"
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

// QueryAerospikeNamespaces 查询 Aerospike 节点的可用命名空间列表
func (s *DatasourceService) QueryAerospikeNamespaces(host string, port int) ([]string, error) {
	policy := as.NewClientPolicy()
	policy.Timeout = 5 * time.Second

	client, err := as.NewClientWithPolicy(policy, host, port)
	if err != nil {
		return nil, fmt.Errorf("无法连接到 Aerospike 服务器: %w", err)
	}
	defer client.Close()

	// 通过 Cluster 获取第一个可用节点，发送 info 命令
	nodes := client.Cluster().GetNodes()
	if len(nodes) == 0 {
		return nil, fmt.Errorf("Aerospike 集群无可用节点")
	}

	infoPolicy := as.NewInfoPolicy()
	infoMap, err := nodes[0].RequestInfo(infoPolicy, "namespaces")
	if err != nil {
		return nil, fmt.Errorf("查询命名空间失败: %w", err)
	}

	// 解析 namespaces 响应，格式: "namespaces\tns1;ns2;test"
	raw, ok := infoMap["namespaces"]
	if !ok || raw == "" {
		return []string{}, nil
	}

	namespaces := strings.Split(raw, ";")
	// 过滤空字符串
	var result []string
	for _, ns := range namespaces {
		ns = strings.TrimSpace(ns)
		if ns != "" {
			result = append(result, ns)
		}
	}
	return result, nil
}

// QueryAerospikeMeta 查询 Aerospike 数据源的元信息
// infoTypes 支持: namespaces, sets, statistics, build, node, cluster-name
// 默认返回 namespaces + sets
func (s *DatasourceService) QueryAerospikeMeta(name string, infoTypes []string) (map[string]interface{}, error) {
	ds, err := s.meta.Get(name)
	if err != nil {
		return nil, fmt.Errorf("数据源 %q 不存在", name)
	}
	if ds.ImplID != "aerospike" {
		return nil, fmt.Errorf("数据源 %q 不是 Aerospike 实现", name)
	}

	host := ds.Config["host"]
	if host == "" {
		host = "localhost"
	}
	port := 3000
	if portStr, ok := ds.Config["port"]; ok && portStr != "" {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("无效的端口配置: %w", err)
		}
	}

	// 连接 Aerospike 节点
	policy := as.NewClientPolicy()
	policy.Timeout = 5 * time.Second
	client, err := as.NewClientWithPolicy(policy, host, port)
	if err != nil {
		return nil, fmt.Errorf("无法连接到 Aerospike 服务器: %w", err)
	}
	defer client.Close()

	nodes := client.Cluster().GetNodes()
	if len(nodes) == 0 {
		return nil, fmt.Errorf("Aerospike 集群无可用节点")
	}

	// 默认 infoTypes
	if len(infoTypes) == 0 {
		infoTypes = []string{"namespaces", "sets"}
	}

	result := make(map[string]interface{})
	infoPolicy := as.NewInfoPolicy()

	// 先收集需要的 info 命令
	var commands []string
	hasSets := false
	for _, t := range infoTypes {
		switch t {
		case "namespaces":
			commands = append(commands, "namespaces")
		case "statistics":
			commands = append(commands, "statistics")
		case "build":
			commands = append(commands, "build")
		case "node":
			commands = append(commands, "node")
		case "cluster-name":
			commands = append(commands, "cluster-name")
		case "sets":
			hasSets = true
			// sets 需要 namespace 列表，稍后逐 ns 查询
		}
	}

	// 如果请求了 sets 但没有 namespaces，先查 namespaces
	if hasSets && !containsInfoType(infoTypes, "namespaces") {
		commands = append(commands, "namespaces")
	}

	// 执行批量 info 查询
	var infoMap map[string]string
	if len(commands) > 0 {
		infoMap, err = nodes[0].RequestInfo(infoPolicy, commands...)
		if err != nil {
			return nil, fmt.Errorf("查询元信息失败: %w", err)
		}
	}

	// 解析 namespaces
	namespaces := parseNamespacesFromInfo(infoMap)

	// 解析简单字段
	if v, ok := infoMap["build"]; ok {
		result["build"] = strings.TrimSpace(v)
	}
	if v, ok := infoMap["node"]; ok {
		result["nodeId"] = strings.TrimSpace(v)
	}
	if v, ok := infoMap["cluster-name"]; ok {
		v = strings.TrimSpace(v)
		if v != "" {
			result["clusterName"] = v
		}
	}
	if v, ok := infoMap["statistics"]; ok {
		result["statistics"] = parseStatistics(v)
	}

	// 返回 namespaces
	if containsInfoType(infoTypes, "namespaces") {
		result["namespaces"] = namespaces
	}

	// 查询 sets（逐 namespace 查询）
	if hasSets && len(namespaces) > 0 {
		setsMap := make(map[string][]string)
		for _, ns := range namespaces {
			setCmd := fmt.Sprintf("sets/%s", ns)
			setInfoMap, err := nodes[0].RequestInfo(infoPolicy, setCmd)
			if err != nil {
				continue
			}
			setsMap[ns] = parseSetsFromInfo(setInfoMap, setCmd)
		}
		result["sets"] = setsMap
	}

	return result, nil
}

// SampleItem 示例数据条目
type SampleItem struct {
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}

// QueryAerospikeSample 通过 ScanAll 采样 Aerospike 数据源中的数据
func (s *DatasourceService) QueryAerospikeSample(name string, limit int) ([]SampleItem, error) {
	ds, err := s.meta.Get(name)
	if err != nil {
		return nil, fmt.Errorf("数据源 %q 不存在", name)
	}
	if ds.ImplID != "aerospike" {
		return nil, fmt.Errorf("数据源 %q 不是 Aerospike 实现", name)
	}

	if limit <= 0 {
		limit = 20
	}

	host := ds.Config["host"]
	if host == "" {
		host = "localhost"
	}
	port := 3000
	if portStr, ok := ds.Config["port"]; ok && portStr != "" {
		port, err = strconv.Atoi(portStr)
		if err != nil {
			return nil, fmt.Errorf("无效的端口配置: %w", err)
		}
	}

	namespace := ds.Config["namespace"]
	if namespace == "" {
		namespace = "test"
	}
	// Use first namespace if comma-separated
	if strings.Contains(namespace, ",") {
		namespace = strings.TrimSpace(strings.Split(namespace, ",")[0])
	}
	setName := ds.Config["set"]

	// 连接 Aerospike 节点
	policy := as.NewClientPolicy()
	policy.Timeout = 5 * time.Second
	client, err := as.NewClientWithPolicy(policy, host, port)
	if err != nil {
		return nil, fmt.Errorf("无法连接到 Aerospike 服务器: %w", err)
	}
	defer client.Close()

	// ScanAll with MaxRecords limit
	scanPolicy := as.NewScanPolicy()
	scanPolicy.MaxRecords = int64(limit)

	recordset, err := client.ScanAll(scanPolicy, namespace, setName)
	if err != nil {
		return nil, fmt.Errorf("扫描数据失败: %w", err)
	}

	var items []SampleItem
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

LOOP:
	for {
		select {
		case result, ok := <-recordset.Results():
			if !ok {
				break LOOP
			}
			if result == nil || result.Record == nil {
				continue
			}
			record := result.Record
			keyStr := ""
			if record.Key != nil {
				keyStr = record.Key.Value().String()
			}

			var value interface{}
			if dataBin, exists := record.Bins["data"]; exists {
				// Try to deserialize as JSON bytes
				if dataBytes, ok := dataBin.([]byte); ok {
					var parsed interface{}
					if json.Unmarshal(dataBytes, &parsed) == nil {
						value = parsed
					} else {
						value = string(dataBytes)
					}
				} else {
					value = dataBin
				}
			} else {
				// No "data" bin, return all bins
				value = record.Bins
			}

			items = append(items, SampleItem{Key: keyStr, Value: value})
			if len(items) >= limit {
				break LOOP
			}
		case <-ctx.Done():
			break LOOP
		}
	}

	if items == nil {
		items = []SampleItem{}
	}
	return items, nil
}

// containsInfoType 检查 infoTypes 列表中是否包含指定类型
func containsInfoType(types []string, target string) bool {
	for _, t := range types {
		if t == target {
			return true
		}
	}
	return false
}

// parseNamespacesFromInfo 从 info 响应中解析 namespace 列表
func parseNamespacesFromInfo(infoMap map[string]string) []string {
	raw, ok := infoMap["namespaces"]
	if !ok || raw == "" {
		return []string{}
	}
	namespaces := strings.Split(raw, ";")
	var result []string
	for _, ns := range namespaces {
		ns = strings.TrimSpace(ns)
		if ns != "" {
			result = append(result, ns)
		}
	}
	return result
}

// parseStatistics 解析 statistics 响应（key=value 分号分隔格式）
func parseStatistics(raw string) map[string]string {
	result := make(map[string]string)
	pairs := strings.Split(raw, ";")
	for _, pair := range pairs {
		kv := strings.SplitN(pair, "=", 2)
		if len(kv) == 2 {
			result[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return result
}

// parseSetsFromInfo 从 sets/<ns> 响应中解析 set 名称列表
// 响应格式示例: "ns=test:set=users:objects=100;ns=test:set=orders:objects=50"
func parseSetsFromInfo(infoMap map[string]string, cmdKey string) []string {
	raw, ok := infoMap[cmdKey]
	if !ok || raw == "" {
		return []string{}
	}

	setNames := make(map[string]struct{})
	entries := strings.Split(raw, ";")
	for _, entry := range entries {
		if entry == "" {
			continue
		}
		// 从 "set=users" 中提取 set 名
		for _, field := range strings.Split(entry, ":") {
			if strings.HasPrefix(field, "set=") {
				setName := strings.TrimPrefix(field, "set=")
				setName = strings.TrimSpace(setName)
				if setName != "" {
					setNames[setName] = struct{}{}
				}
			}
		}
	}

	var result []string
	for name := range setNames {
		result = append(result, name)
	}
	return result
}
