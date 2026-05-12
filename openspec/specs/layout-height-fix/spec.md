## ADDED Requirements

### Requirement: 页面锁定视口高度
系统 SHALL 使整个页面高度精确等于浏览器视口高度（`100vh`），不出现全页垂直滚动条。`body`、`#root` 和 `.unihub-layout` 容器层级链条中，所有元素 SHALL 使用固定高度（`height: 100vh`）和非溢出的 `overflow: hidden`，而非可增长的 `min-height`。

#### Scenario: 浏览器窗口正常显示
- **WHEN** 用户在任何支持的浏览器中打开 Unihub 管理控制台
- **THEN** 页面整体不出现垂直滚动条，内容精确占满视口高度，无溢出空白区域

#### Scenario: 视口高度变化
- **WHEN** 用户调整浏览器窗口高度
- **THEN** 页面整体高度自动适配新的视口高度，无页面级滚动条出现

### Requirement: 布局盒模型修正
系统 SHALL 对 `.unihub-layout` 容器使用 `box-sizing: border-box`，确保 `padding: 12px` 被计入 `height: 100vh` 之内，避免因默认 `content-box` 导致总渲染高度超出视口。

#### Scenario: padding 计入 height
- **WHEN** `.unihub-layout` 设置 `height: 100vh` 和 `padding: 12px`
- **THEN** 实际渲染总高度精确为 100vh（padding 在内部扣除），不超出视口

### Requirement: 侧边栏固定不滚动
系统 SHALL 将 `.unihub-sidebar` 设置为 `overflow: hidden`，侧边栏不出现垂直滚动条。侧边栏内容（Logo、菜单、控制按钮）在视口内固定显示。

#### Scenario: 侧边栏不滚动
- **WHEN** 用户在管理控制台中操作
- **THEN** 左侧边栏不出现独立的垂直滚动条，其内容保持固定

### Requirement: 内容区域独立滚动
系统 SHALL 保持 `.unihub-content` 为 `overflow: auto`，当页面内容溢出时，仅内容区域内部出现垂直滚动条，不影响侧边栏和整体页面布局。

#### Scenario: 内容溢出时仅内容区滚动
- **WHEN** 右侧内容区内容高度超出可用空间（如数据查询页面键列表过长）
- **THEN** 内容区内部出现垂直滚动条，侧边栏和页面整体保持固定不动

#### Scenario: 内容未溢出时无滚动条
- **WHEN** 右侧内容区内容高度在可用空间之内
- **THEN** 内容区不显示滚动条，页面整体无任何滚动条
