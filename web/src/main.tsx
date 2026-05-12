import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './App.tsx'
import DatasourcePage from './pages/DatasourcePage'
import DataQueryPage from './pages/DataQueryPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/datasources" element={<DatasourcePage />} />
            <Route path="/data-query" element={<DataQueryPage />} />
            <Route path="*" element={<Navigate to="/datasources" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>,
)
