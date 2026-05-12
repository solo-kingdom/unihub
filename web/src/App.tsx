import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Layout, Menu } from 'antd'
import {
  DatabaseOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import DatasourcePage from './pages/DatasourcePage'
import DataQueryPage from './pages/DataQueryPage'
import './App.css'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/datasources', icon: <DatabaseOutlined />, label: '数据源管理' },
  { key: '/data-query', icon: <SearchOutlined />, label: '数据查询' },
]

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Layout style={{ minHeight: '100vh' }}>
          <Sider width={220} theme="light">
            <div style={{ padding: '16px 24px', fontSize: 18, fontWeight: 700, borderBottom: '1px solid #f0f0f0' }}>
              UniHub
            </div>
            <Menu
              mode="inline"
              items={menuItems}
              defaultSelectedKeys={['/datasources']}
              onClick={({ key }) => window.location.href = key}
              style={{ borderRight: 0 }}
            />
          </Sider>
          <Layout>
            <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', fontSize: 16, fontWeight: 500 }}>
              数据源管理平台
            </Header>
            <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
              <Routes>
                <Route path="/datasources" element={<DatasourcePage />} />
                <Route path="/data-query" element={<DataQueryPage />} />
                <Route path="*" element={<Navigate to="/datasources" replace />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
