## 1. 前端：Aerospike 查询模式 UI 重构

- [x] 1.1 在 `DataQueryPage.tsx` 中提取 `isAerospike` 计算变量（基于 `selectedDatasource?.implId === 'aerospike'`），用于后续条件渲染
- [x] 1.2 对 Aerospike 数据源隐藏左侧键列表面板（包括键列表、搜索框、随机按钮），改为全宽值详情面板布局
- [x] 1.3 为 Aerospike 添加 key 直接查询工具栏：包含 key 输入框、查询按钮、新增按钮、元信息按钮
- [x] 1.4 实现 key 输入框的 Enter 键触发查询
- [x] 1.5 实现 key 不存在时的提示（"键不存在"，隐藏编辑/删除按钮）
- [x] 1.6 实现清空输入框时恢复空状态

## 2. 前端：新增/编辑/删除交互适配

- [x] 2.1 Aerospike 新增键值成功后，自动填入 key 输入框并展示值（不调用 `fetchKeys`）
- [x] 2.2 Aerospike 编辑键值成功后，刷新值详情面板展示新值
- [x] 2.3 Aerospike 删除键值成功后，清空 key 输入框和值详情面板
- [x] 2.4 Aerospike 选择数据源时不触发 `fetchKeys`（因为 List 不支持）

## 3. 前端：上下文信息展示

- [x] 3.1 确认新增键值弹窗中的 namespace/set 上下文标签在 Aerospike 查询模式下正常显示（现有代码已实现，需验证）

## 4. 验证

- [x] 4.1 选中 Aerospike 数据源，确认页面显示 key 输入查询栏，无键列表/搜索/随机按钮
- [x] 4.2 输入已有 key 查询，确认值正确展示
- [x] 4.3 新增键值，确认成功后自动展示新数据
- [x] 4.4 编辑键值，确认更新后值刷新
- [x] 4.5 删除键值，确认界面清空
- [x] 4.6 切换到 Redis/BoltDB 数据源，确认原有键列表浏览模式正常工作
