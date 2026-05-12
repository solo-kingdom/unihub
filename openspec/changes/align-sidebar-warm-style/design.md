## Context

unihub 当前使用 Ant Design 的 `Layout` + `Sider` 组件构建侧边栏，暗色主题 (`#1a1a2e`)。同系列项目 uhub 已采用自定义 div 布局 + 暖色白底风格，包含三态侧边栏交互（展开/图标/隐藏）。本次改动将 unihub 的布局框架对齐到 uhub 的视觉和交互风格。

当前状态：
- `App.tsx` 使用 `<Layout>` + `<Sider>` 构建布局
- `App.css` 为空，样式全部内联
- 无 SCSS 支持（Vite 未配置 sass）
- 菜单项 2 个：数据源管理、数据查询

## Goals / Non-Goals

**Goals:**
- 对齐 uhub 的暖色白底视觉风格
- 实现三态侧边栏交互（展开 200px / 图标 60px / 隐藏）
- 建立 SCSS 变量系统，统一管理颜色和尺寸
- 保持菜单项和页面内容不变

**Non-Goals:**
- 不改动页面内容区样式（DatasourcePage、DataQueryPage）
- 不新增菜单项或功能
- 不引入动态子菜单等 uhub 特有功能

## Decisions

### 1. 布局方案：自定义 div 替代 Ant Design Layout/Sider

**选择**: 使用自定义 `div` + flex 布局，对齐 uhub 的 `.uhub-layout` 模式。

**理由**: Ant Design 的 `Sider` 组件不支持"隐藏"状态，只能展开/折叠。三态交互需要完全控制侧边栏的 DOM 和 CSS。uhub 已验证了自定义 div 方案的可行性。

**替代方案**: 继续使用 Ant Design Sider — 但无法实现隐藏态，且深色主题定制灵活性不足。

### 2. 样式方案：SCSS 变量系统

**选择**: 新增 `src/styles/variables.scss`，复用 uhub 的变量定义。

**理由**: SCSS 变量系统提供集中管理、类型安全和可维护性。uhub 已有成熟的变量体系可直接复用。

**替代方案**: CSS 变量 — 不引入 sass 依赖，但失去嵌套、混入等 SCSS 能力。考虑到要长期对齐 uhub，SCSS 是更好的选择。

### 3. 三态侧边栏交互实现

**选择**: 状态机模式 `MenuMode = 'expanded' | 'icon-only' | 'hidden'`。

各状态行为：
- **expanded**: 200px 宽，完整菜单文字，底部双按钮（折叠 | 隐藏）
- **icon-only**: 60px 宽，仅图标，底部双按钮（展开 | 隐藏）
- **hidden**: 侧边栏不可见，左边缘 8px 触发区显示浮层侧边栏，左下角 FAB 按钮恢复展开

### 4. 菜单主题定制

**选择**: 使用 Ant Design `ConfigProvider` 的 `Menu` 组件主题覆盖。

```typescript
const menuTheme = {
  components: {
    Menu: {
      itemBg: 'transparent',
      itemHoverBg: 'transparent',
      itemSelectedBg: 'transparent',
      itemColor: '#6b4e2e',
      itemHoverColor: '#543b21',
      itemSelectedColor: '#543b21',
    },
  },
}
```

加上 SCSS 中的 hover/selected 背景色覆盖（`#faf5ef` / `#f5ede3`）。

## Risks / Trade-offs

- **[新增 sass 依赖]** → Vite 内置支持，安装 `sass` 即可，风险极低
- **[页面内容区风格不统一]** → 本次只改侧边栏，页面内部仍使用冷色调边框和背景，后续可逐步对齐
- **[三态交互增加代码复杂度]** → uhub 已验证，直接移植模式，复杂度可控
