import { useState, useRef, useCallback } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, Button, Tooltip, ConfigProvider } from 'antd'
import type { MenuProps } from 'antd'
import {
  DatabaseOutlined,
  SearchOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EyeInvisibleOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import './App.scss'

type MenuMode = 'expanded' | 'icon-only' | 'hidden'

const menuTheme = {
  components: {
    Menu: {
      itemBg: 'transparent',
      itemHoverBg: 'transparent',
      itemSelectedBg: 'transparent',
      itemColor: '#6b4e2e',
      itemHoverColor: '#543b21',
      itemSelectedColor: '#543b21',
      collapsedWidth: 58,
    },
  },
}

const menuItems: MenuProps['items'] = [
  { key: '/datasources', icon: <DatabaseOutlined />, label: <Link to="/datasources">数据源管理</Link> },
  { key: '/data-query', icon: <SearchOutlined />, label: <Link to="/data-query">数据查询</Link> },
]

function AppLayout() {
  const location = useLocation()
  const [menuMode, setMenuMode] = useState<MenuMode>('expanded')
  const [overlayVisible, setOverlayVisible] = useState(false)
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedKeys = [location.pathname.startsWith('/data-query') ? '/data-query' : '/datasources']
  const isCollapsed = menuMode === 'icon-only'

  const handleShowOverlay = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current)
      overlayTimeoutRef.current = null
    }
    setOverlayVisible(true)
  }, [])

  const handleHideOverlay = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current)
    }
    overlayTimeoutRef.current = setTimeout(() => {
      setOverlayVisible(false)
    }, 150)
  }, [])

  const renderMenu = (forOverlay = false) => (
    <ConfigProvider theme={menuTheme}>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        inlineCollapsed={forOverlay ? false : isCollapsed}
        style={{ background: 'transparent', borderRight: 'none', flex: 1 }}
      />
    </ConfigProvider>
  )

  const renderSidebarControls = () => {
    if (menuMode === 'expanded') {
      return (
        <div className="unihub-controls-expanded">
          <Tooltip title="仅图标">
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={() => setMenuMode('icon-only')}
              style={{ flex: 1 }}
            />
          </Tooltip>
          <Tooltip title="隐藏">
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setMenuMode('hidden')}
              style={{ flex: 1 }}
            />
          </Tooltip>
        </div>
      )
    }
    if (menuMode === 'icon-only') {
      return (
        <div className="unihub-controls-icon">
          <Tooltip title="展开" placement="right">
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setMenuMode('expanded')}
              className="unihub-icon-control-btn"
            />
          </Tooltip>
          <Tooltip title="隐藏" placement="right">
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setMenuMode('hidden')}
              className="unihub-icon-control-btn"
            />
          </Tooltip>
        </div>
      )
    }
    return null
  }

  const sidebarSizeClass = isCollapsed ? 'unihub-sidebar-collapsed' : 'unihub-sidebar-expanded'
  const logoSizeClass = isCollapsed ? 'unihub-logo-collapsed' : 'unihub-logo-expanded'

  return (
    <div className="unihub-layout">
      {/* Sidebar (expanded / icon-only) */}
      {menuMode !== 'hidden' && (
        <div className={`unihub-sidebar ${sidebarSizeClass}`}>
          <div className={`unihub-sidebar-logo ${logoSizeClass}`}>
            {isCollapsed ? 'U' : 'UniHub'}
          </div>
          {renderMenu()}
          {renderSidebarControls()}
        </div>
      )}

      {/* Content */}
      <div className="unihub-content">
        <Outlet />
      </div>

      {/* Hidden mode: edge trigger + overlay + FAB */}
      {menuMode === 'hidden' && (
        <>
          <div onMouseEnter={handleShowOverlay} className="unihub-edge-trigger" />

          <div
            onMouseEnter={handleShowOverlay}
            onMouseLeave={handleHideOverlay}
            className={`unihub-overlay-sidebar${overlayVisible ? ' unihub-overlay-visible' : ''}`}
          >
            <div className="unihub-overlay-logo">UniHub</div>
            {renderMenu(true)}
          </div>

          <Tooltip title="显示菜单" placement="right">
            <Button
              type="default"
              icon={<MenuOutlined />}
              onClick={() => setMenuMode('expanded')}
              className={`unihub-show-fab${overlayVisible ? ' unihub-fab-hidden' : ''}`}
            />
          </Tooltip>
        </>
      )}
    </div>
  )
}

export default AppLayout
