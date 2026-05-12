package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

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
	list, err := h.svc.List()
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
		Type   model.DatasourceType `json:"type"`
		Config map[string]string    `json:"config"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}

	result, err := h.svc.TestNewConnection(req.Type, req.Config)
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
