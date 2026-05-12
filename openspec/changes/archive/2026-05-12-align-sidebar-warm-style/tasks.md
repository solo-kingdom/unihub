## 1. 环境准备

- [x] 1.1 安装 sass 开发依赖 (`npm install -D sass`)
- [x] 1.2 创建 `web/src/styles/variables.scss`，从 uhub 复制暖色变量体系

## 2. 样式文件

- [x] 2.1 创建 `web/src/App.scss`，从 uhub 的 Layout/index.scss 移植三态侧边栏样式（去除动态子菜单相关样式）
- [x] 2.2 删除 `web/src/App.css`（已被 App.scss 替代）

## 3. 布局组件重写

- [x] 3.1 重写 `web/src/App.tsx`：替换 Ant Design Layout/Sider 为自定义 div 布局，引入 MenuMode 三态状态机
- [x] 3.2 实现展开态和图标态侧边栏（含底部控制按钮）
- [x] 3.3 实现隐藏态（左边缘触发区 + 浮层侧边栏 + FAB 按钮）

## 4. 验证

- [x] 4.1 启动 dev server 验证三态切换正常，菜单导航正常，页面内容不受影响
