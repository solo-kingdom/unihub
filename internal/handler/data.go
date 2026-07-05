package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/solo-kingdom/unihub/internal/service"
)

// DataHandler 数据操作 API handler
type DataHandler struct {
	svc *service.DataService
}

// NewDataHandler 创建数据操作 handler
func NewDataHandler(svc *service.DataService) *DataHandler {
	return &DataHandler{svc: svc}
}

// Get 读取数据 GET /api/v1/datasources/{name}/data?key=xxx
func (h *DataHandler) Get(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	key := r.URL.Query().Get("key")
	if key == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "key 参数不能为空")
		return
	}

	value, err := h.svc.Get(r.Context(), name, key)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key":   key,
		"value": value,
	})
}

// Set 写入数据 PUT /api/v1/datasources/{name}/data
func (h *DataHandler) Set(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")

	var req struct {
		Key   string      `json:"key"`
		Value interface{} `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "无效的请求体")
		return
	}
	if req.Key == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "key 不能为空")
		return
	}

	if err := h.svc.Set(r.Context(), name, req.Key, req.Value); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "ok"})
}

// Delete 删除数据 DELETE /api/v1/datasources/{name}/data?key=xxx
func (h *DataHandler) Delete(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	key := r.URL.Query().Get("key")
	if key == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "key 参数不能为空")
		return
	}

	if err := h.svc.Delete(context.Background(), name, key); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	writeNoContent(w)
}

// ListKeys 列出键 GET /api/v1/datasources/{name}/keys?pattern=xxx
func (h *DataHandler) ListKeys(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	pattern := r.URL.Query().Get("pattern")

	keys, err := h.svc.ListKeys(r.Context(), name, pattern)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", err.Error())
		return
	}

	if keys == nil {
		keys = []string{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"keys": keys,
	})
}

// RandomKey 获取随机键 GET /api/v1/datasources/{name}/keys/random
func (h *DataHandler) RandomKey(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")

	key, err := h.svc.RandomKey(r.Context(), name)
	if err != nil {
		writeError(w, http.StatusNotFound, "not_found", err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"key": key,
	})
}

// Exists 检查键是否存在 HEAD /api/v1/datasources/{name}/data?key=xxx
func (h *DataHandler) Exists(w http.ResponseWriter, r *http.Request) {
	name := getURLParam(r, "name")
	key := r.URL.Query().Get("key")
	if key == "" {
		writeError(w, http.StatusBadRequest, "bad_request", "key 参数不能为空")
		return
	}

	exists, err := h.svc.Exists(r.Context(), name, key)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", err.Error())
		return
	}

	if exists {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusNotFound)
	}
}
