## 1. Backend - Key Pattern Search

- [x] 1.1 Add glob pattern matching utility `matchPattern(pattern, key string) bool` in `internal/service/data.go` using `path.Match`
- [x] 1.2 Add `ListKeys` method with pattern filtering to `DataService` — when pattern is non-empty, filter the result of `storage.List(ctx)` through `matchPattern`
- [x] 1.3 Update `DataHandler.ListKeys` to read optional `pattern` query param from URL and pass to service
- [x] 1.4 No route changes needed — `GET /keys` already registered, only handler logic changes

## 2. Backend - Random Key

- [x] 2.1 Add `RandomKey(ctx, dsName string) (string, error)` method to `DataService` — calls `List()`, picks random index with `math/rand`, returns key name; returns error if list is empty
- [x] 2.2 Add `RandomKey` handler method to `DataHandler` — calls service, returns `{ "key": "..." }` on success, 404 if no keys
- [x] 2.3 Register `GET /api/v1/datasources/{name}/keys/random` route in `main.go` (must register BEFORE the catch-all `/{name}` routes)

## 3. Backend - Key Existence Check (HEAD)

- [x] 3.1 Add `Exists(ctx, dsName, key string) (bool, error)` method to `DataService` — delegates to `storage.Exists(ctx, key)`
- [x] 3.2 Add `Exists` handler method to `DataHandler` responding to HEAD requests — returns 200 if key exists, 404 if not
- [x] 3.3 Register `HEAD /api/v1/datasources/{name}/data` route in `main.go`

## 4. Frontend - Fix Edit Form Echo

- [x] 4.1 In `DatasourcePage.tsx`, merge the two separate `<Form>` components into a single `<Form>` wrapping all fields (name, typeId, implId, plus conditional config fields)
- [x] 4.2 Replace `handleOpenEdit`'s `setTimeout(0)` hack: after setting `selectedTypeId`/`selectedImplId` and opening modal, use `useEffect` that watches `[modalOpen, editingDs, currentImplMeta]` to call `form.setFieldsValue()` with ALL fields (identity + config) once `currentImplMeta` is available
- [x] 4.3 Move the "测试连接" button inside the single Form (it was in the second form)
- [ ] 4.4 Test: open edit for a datasource with saved config → verify all config fields (addr, password, db, etc.) show saved values; edit and save → verify update persists

## 5. Frontend - Data Query Enhancements

- [x] 5.1 Add new API functions to `web/src/api/index.ts`: `dataApi.searchKeys(dsName, pattern)`, `dataApi.randomKey(dsName)`, `dataApi.exists(dsName, key)`
- [x] 5.2 Add search `<Input>` with search icon and clear button above the key list in `DataQueryPage.tsx` — implement client-side filter with 300ms debounce triggering server-side `searchKeys`; show filtered key count in panel header; clear search on datasource switch
- [x] 5.3 Add "🎲 随机" `<Button>` next to the search input — calls `randomKey` API, on success calls `handleSelectKey(randomKey)` to auto-select and load value; show message if no keys available
- [x] 5.4 In the "新增键值" Modal, add key existence check: on key input change (500ms debounce), call `dataApi.exists`; if key exists, show Ant Design `Form.Item` `validateStatus="warning"` with `help="该键名已存在，继续添加将覆盖原值"`
- [ ] 5.5 Test: search keys by pattern → filtered list shown; click random → random key selected and value loaded; add key with existing name → warning shown; add key with new name → no warning
