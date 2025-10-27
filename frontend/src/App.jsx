import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, message } from 'antd'
import { useTranslation } from 'react-i18next'

// 组件导入
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import MembersPage from './pages/MembersPage'
import PlansPage from './pages/PlansPage'
import OrdersPage from './pages/OrdersPage'
import ReviewsPage from './pages/ReviewsPage'
import HomePage from './pages/HomePage'
import SettingsPage from './pages/SettingsPage'

// 工具导入
import { getToken } from './utils/auth'

function App() {
  const { t } = useTranslation()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查登录状态
    const token = getToken()
    if (token) {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
    message.success(t('auth.loginSuccess'))
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('admin_token')
    message.success(t('auth.logout'))
  }

  if (loading) {
    return (
      <Layout style={{ height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div>{t('common.loading')}</div>
      </Layout>
    )
  }

  return (
    <Router>
      <Routes>
        {/* 登录页面 */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/admin" replace /> : 
            <LoginPage onLogin={handleLogin} />
          } 
        />
        
        {/* 管理后台路由 */}
        <Route 
          path="/admin/*" 
          element={
            isAuthenticated ? 
            <AdminLayout onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Navigate to="/admin/members" replace />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AdminLayout> :
            <Navigate to="/login" replace />
          } 
        />
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  )
}

export default App
