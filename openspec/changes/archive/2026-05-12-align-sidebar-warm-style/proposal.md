## Why

当前 unihub 使用 Ant Design 默认的暗色侧边栏 (`#1a1a2e`)，视觉上与同系列项目 uhub 的暖色白底风格不统一。需要将侧边栏及整体布局框架对齐为 uhub 的暖色卡片式设计，同时引入三态侧边栏交互（展开/图标/隐藏），提升数据查询等内容密集型页面的可用空间。

## What Changes

- 将布局组件从 Ant Design `Layout/Sider` 替换为自定义 `div` + flex 布局，对齐 uhub 的卡片式容器风格
- 侧边栏从暗色 (`#1a1a2e`) 改为暖色白底 (`#ffffff`)，文字改为暖棕色 (`#6b4e2e`)
- 全局背景从冷灰 (`#f8f9fc`) 改为暖色渐变
- 引入三态侧边栏交互：展开 (200px) → 图标 (60px) → 隐藏 (边缘触发 + 浮层 + FAB)
- 样式方案从内联 CSS 迁移到 SCSS 变量系统
- 菜单项保持不变（数据源管理、数据查询）

## Capabilities

### New Capabilities

_(无新增能力)_

### Modified Capabilities

- `web-console`: 侧边栏视觉风格从暗色改为暖色白底，布局从 Ant Design Layout/Sider 改为自定义 div 布局，侧边栏交互从两态（展开/折叠）升级为三态（展开/图标/隐藏）

## Impact

- `web/src/App.tsx` — 重写布局组件
- `web/src/App.css` — 替换为 `App.scss`
- 新增 `web/src/styles/variables.scss` — 样式变量
- 新增 `web/src/App.scss` — 布局样式
- `web/package.json` — 新增 `sass` 开发依赖
- `openspec/specs/web-console/spec.md` — 更新侧边栏相关需求描述
