package main

import (
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/solo-kingdom/unihub/internal/handler"
	"github.com/solo-kingdom/unihub/internal/service"
	"github.com/solo-kingdom/unihub/internal/store"
)

func main() {
	port := flag.String("port", "", "listen port (default: 8080, env: PORT)")
	flag.Parse()

	listenPort := *port
	if listenPort == "" {
		listenPort = os.Getenv("PORT")
	}
	if listenPort == "" {
		listenPort = "8080"
	}

	// 初始化元数据存储
	metaStore, err := store.NewMetadataStore("data/unihub-meta.db")
	if err != nil {
		log.Fatalf("failed to init metadata store: %v", err)
	}
	defer metaStore.Close()

	// 初始化连接管理器
	manager := store.NewManager(metaStore)
	defer manager.CloseAll()

	// 初始化服务层
	dsService := service.NewDatasourceService(metaStore, manager)
	dataService := service.NewDataService(manager)

	// 初始化 handler
	dsHandler := handler.NewDatasourceHandler(dsService)
	dataHandler := handler.NewDataHandler(dataService)

	// 创建路由
	r := chi.NewRouter()

	// 全局中间件
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(loggingMiddleware)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(corsMiddleware)

	// Health check
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// 数据源类型
	r.Get("/api/v1/datasource-types", dsHandler.ListTypes)

	// 数据源管理
	r.Route("/api/v1/datasources", func(r chi.Router) {
		r.Get("/", dsHandler.List)
		r.Post("/", dsHandler.Create)
		r.Post("/test", dsHandler.TestNewConnection)

		// Aerospike 命名空间查询（必须放在 /{name} 之前）
		r.Post("/aerospike/namespaces", dsHandler.QueryAerospikeNamespaces)

		r.Route("/{name}", func(r chi.Router) {
			r.Get("/", dsHandler.Get)
			r.Put("/", dsHandler.Update)
			r.Delete("/", dsHandler.Delete)
			r.Post("/test", dsHandler.TestConnection)

			// Aerospike 元信息查询
			r.Get("/aerospike/meta", dsHandler.HandleAerospikeMeta)
			// Aerospike 示例数据采样
			r.Get("/aerospike/sample", dsHandler.HandleAerospikeSample)

			// 数据操作
			r.Get("/keys/random", dataHandler.RandomKey)
			r.Get("/keys", dataHandler.ListKeys)
			r.Get("/data", dataHandler.Get)
			r.Head("/data", dataHandler.Exists)
			r.Put("/data", dataHandler.Set)
			r.Delete("/data", dataHandler.Delete)
		})
	})

	// 静态文件服务 + SPA fallback
	r.Handle("/*", staticFileServer())

	fmt.Printf("unihub server starting on :%s\n", listenPort)
	if err := http.ListenAndServe(":"+listenPort, r); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		duration := time.Since(start)
		// Only log API requests
		if strings.HasPrefix(r.URL.Path, "/api/") {
			log.Printf("[%s] %s %d %s", r.Method, r.URL.Path, ww.Status(), duration)
		}
	})
}

// staticFileServer returns a handler that serves embedded static files
// with SPA fallback (non-API routes return index.html)
func staticFileServer() http.Handler {
	sub, _ := fs.Sub(staticFiles, "web/dist")
	fileServer := http.FileServer(http.FS(sub))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		// Try to open the file from embedded FS
		fsys, _ := fs.Sub(staticFiles, "web/dist")
		if _, err := fs.Stat(fsys, path); err != nil {
			// File not found, serve index.html for SPA routing
			r.URL.Path = "/"
		}

		fileServer.ServeHTTP(w, r)
	})
}
