.PHONY: dev build clean

# Go parameters
GOCMD := go
GOBUILD := $(GOCMD) build
GORUN := $(GOCMD) run
GOTEST := $(GOCMD) test
BINARY_NAME := unihub
BUILD_DIR := bin
WEB_DIR := web

# Frontend parameters
NPM := npm

.PHONY: all
all: build

## dev: Start backend and frontend in development mode
.PHONY: dev
dev:
	@echo ">>> Starting backend server..."
	$(GORUN) . & BACKEND_PID=$$!; \
	echo ">>> Starting frontend dev server..."; \
	(cd $(WEB_DIR) && $(NPM) run dev); \
	kill $$BACKEND_PID 2>/dev/null

## frontend: Install frontend dependencies
.PHONY: frontend
frontend:
	@echo ">>> Installing frontend dependencies..."
	(cd $(WEB_DIR) && $(NPM) install)

## build-frontend: Build frontend static assets
.PHONY: build-frontend
build-frontend:
	@echo ">>> Building frontend..."
	(cd $(WEB_DIR) && $(NPM) run build)

## build: Build single binary with embedded frontend
.PHONY: build
build:
ifndef SKIP_FRONTEND
	$(MAKE) build-frontend
endif
	@echo ">>> Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 $(GOBUILD) -o $(BUILD_DIR)/$(BINARY_NAME) .
	@echo ">>> Build complete: $(BUILD_DIR)/$(BINARY_NAME)"

## clean: Clean build artifacts
.PHONY: clean
clean:
	@echo ">>> Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(WEB_DIR)/dist
	@find . -name "*.test" -delete
	@find . -name "*.out" -delete

## test: Run tests
.PHONY: test
test:
	@echo ">>> Running tests..."
	$(GOTEST) -v ./...

## tidy: Tidy Go modules
.PHONY: tidy
tidy:
	@echo ">>> Tidying Go modules..."
	$(GOCMD) mod tidy

## help: Show help
.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  dev             Start backend and frontend in development mode"
	@echo "  build           Build single binary (frontend + backend)"
	@echo "  build-frontend  Build frontend static assets only"
	@echo "  frontend        Install frontend dependencies"
	@echo "  clean           Clean build artifacts"
	@echo "  test            Run tests"
	@echo "  tidy            Tidy Go modules"
	@echo "  help            Show this help message"
	@echo ""
	@echo "Environment variables:"
	@echo "  SKIP_FRONTEND=1 Skip frontend build during 'make build'"
