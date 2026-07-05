package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// APIError 统一错误响应格式
type APIError struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, errType string, message string) {
	writeJSON(w, status, APIError{Error: errType, Message: message})
}

func writeNoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// getURLParam 从 URL 路径获取参数
func getURLParam(r *http.Request, key string) string {
	return chi.URLParam(r, key)
}
