package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/solo-kingdom/unihub/internal/model"
	"github.com/solo-kingdom/unihub/internal/service"
)

// DatasourceHandler 数据源管理 API handler
type DatasourceHandler struct {
	svc *service.DatasourceService
}

// NewDatasourceHandler 创建数据源 handler
func NewDatasourceHandler(svc *service.DatasourceService) *DatasourceHandler {
	return &DatasourceHandler{svc: svc}
}

// List 列出所有数据源 GET /api/v1/datasources
func (h *DatasourceHandler) List(w http.ResponseWriter, r *http.Request) {
	typeID := r.URL.Query().Get("typeId")
	implID := r.URL.Query().Get("implId")
	list, err := h.svc.List(typeID, implID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}
	if list == nil {
		list = []*model.Datasource{}
	}
	writeJSON(w, http.StatusOK, list)
}

// Get 获取单个数据源 GET /api/v1/datasources/{name}
func (h *DatasourceHandler) Get(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	ds, err := h.svc.Get(name)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("数据源 %q 不存在", name))
		return
	}
	writeJSON(w, http.StatusOK, ds)
}

// Create 创建数据源 POST /api/v1/datasources
func (h *DatasourceHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateDatasourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}

	ds, err := h.svc.Create(&req)
	if err != nil {
		switch err.Error() {
		case fmt.Sprintf("datasource with name %q already exists", req.Name):
			writeError(w, http.StatusConflict, "conflict", err.Error())
		default:
			if contains(err.Error(), "unsupported") {
				writeError(w, http.StatusBadRequest, "bad_request", err.Error())
			} else if contains(err.Error(), "required") {
				writeError(w, http.StatusBadRequest, "bad_request", err.Error())
			} else {
				writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
			}
		}
		return
	}

	writeJSON(w, http.StatusCreated, ds)
}

// Update 更新数据源 PUT /api/v1/datasources/{name}
func (h *DatasourceHandler) Update(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")

	var req model.UpdateDatasourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}

	ds, err := h.svc.Update(name, &req)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("数据源 %q 不存在", name))
		return
	}

	writeJSON(w, http.StatusOK, ds)
}

// Delete 删除数据源 DELETE /api/v1/datasources/{name}
func (h *DatasourceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")

	if err := h.svc.Delete(name); err != nil {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("数据源 %q 不存在", name))
		return
	}

	writeNoContent(w)
}

// TestConnection 测试连接 POST /api/v1/datasources/{name}/test
func (h *DatasourceHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")

	result, err := h.svc.TestConnection(name)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", fmt.Sprintf("数据源 %q 不存在", name))
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// TestNewConnection 测试新数据源连接 POST /api/v1/datasources/test
func (h *DatasourceHandler) TestNewConnection(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ImplID string            `json:"implId"`
		Config map[string]string `json:"config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}

	result, err := h.svc.TestNewConnection(req.ImplID, req.Config)
	if err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// ListTypes 列出支持的数据源类型 GET /api/v1/datasource-types
func (h *DatasourceHandler) ListTypes(w http.ResponseWriter, r *http.Request) {
	types := h.svc.ListTypes()
	writeJSON(w, http.StatusOK, types)
}

// QueryAerospikeNamespaces 查询 Aerospike 命名空间 POST /api/v1/datasources/aerospike/namespaces
func (h *DatasourceHandler) QueryAerospikeNamespaces(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Host string `json:"host"`
		Port int    `json:"port"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}
	if req.Host == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "host 参数不能为空")
		return
	}
	if req.Port <= 0 || req.Port > 65535 {
		writeError(w, http.StatusBadRequest, "bad_request", "port 参数无效")
		return
	}

	namespaces, err := h.svc.QueryAerospikeNamespaces(req.Host, req.Port)
	if err != nil {
		writeError(w, http.StatusBadGateway, "connection_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"namespaces": namespaces,
	})
}

// HandleAerospikeMeta 查询 Aerospike 元信息 GET /api/v1/datasources/{name}/aerospike/meta
func (h *DatasourceHandler) HandleAerospikeMeta(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "name 参数不能为空")
		return
	}

	// 解析 ?info= 参数（逗号分隔）
	infoParam := r.URL.Query().Get("info")
	var infoTypes []string
	if infoParam != "" {
		for _, t := range strings.Split(infoParam, ",") {
			t = strings.TrimSpace(t)
			if t != "" {
				infoTypes = append(infoTypes, t)
			}
		}
	}

	meta, err := h.svc.QueryAerospikeMeta(name, infoTypes)
	if err != nil {
		// 判断是否是 "不是 Aerospike 实现" 的错误
		if strings.Contains(err.Error(), "不是 Aerospike 实现") {
			writeError(w, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		if strings.Contains(err.Error(), "不存在") {
			writeError(w, http.StatusNotFound, "not_found", err.Error())
			return
		}
		writeError(w, http.StatusBadGateway, "connection_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, meta)
}

// HandleAerospikeSample 采样查询 Aerospike 数据 GET /api/v1/datasources/{name}/aerospike/sample
func (h *DatasourceHandler) HandleAerospikeSample(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "name 参数不能为空")
		return
	}

	// 解析 ?limit= 参数
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	items, err := h.svc.QueryAerospikeSample(name, limit)
	if err != nil {
		if strings.Contains(err.Error(), "不是 Aerospike 实现") {
			writeError(w, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		if strings.Contains(err.Error(), "不存在") {
			writeError(w, http.StatusNotFound, "not_found", err.Error())
			return
		}
		writeError(w, http.StatusBadGateway, "connection_failed", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items": items,
	})
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsStr(s, substr))
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
