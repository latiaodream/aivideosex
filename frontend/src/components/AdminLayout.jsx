import React, { useState } from 'react'
import { Layout, Menu, Button, Space, Select, Drawer, Typography } from 'antd'
import { 
  UserOutlined, 
  CreditCardOutlined, 
  ShoppingOutlined,
  StarOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { languageOptions } from '../i18n'

const { Header, Sider, Content } = Layout
const { Text } = Typography

// 移动端断点
const useBreakpoint = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  return isMobile
}

export default function AdminLayout({ children, onLogout }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useBreakpoint()
  const [drawerVisible, setDrawerVisible] = useState(false)

  // 菜单配置
  const menuItems = [
    {
      key: '/admin/members',
      icon: <UserOutlined />,
      label: t('menu.members')
    },
    {
      key: '/admin/plans',
      icon: <CreditCardOutlined />,
      label: t('menu.plans')
    },
    {
      key: '/admin/orders',
      icon: <ShoppingOutlined />,
      label: t('menu.orders')
    },
    {
      key: '/admin/reviews',
      icon: <StarOutlined />,
      label: t('menu.reviews')
    },
    {
      key: '/admin/home',
      icon: <HomeOutlined />,
      label: t('menu.home')
    },
    {
      key: '/admin/settings',
      icon: <HomeOutlined />,
      label: t('menu.settings')
    }
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
    if (isMobile) {
      setDrawerVisible(false)
    }
  }

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language)
  }

  const MenuComponent = () => (
    <Menu
      theme="light"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  )

  const HeaderActions = () => (
    <Space>
      <Select
        value={i18n.language}
        onChange={handleLanguageChange}
        size="small"
        style={{ width: 100 }}
        suffixIcon={<GlobalOutlined />}
        options={languageOptions.map(opt => ({
          value: opt.value,
          label: opt.icon
        }))}
      />
      <Button 
        type="text" 
        icon={<LogoutOutlined />} 
        onClick={onLogout}
        size="small"
      >
        {!isMobile && t('auth.logout')}
      </Button>
    </Space>
  )

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          width={200}
          style={{
            background: '#fff',
            borderRight: '1px solid #f0f0f0'
          }}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 24,
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Text strong style={{ color: '#1890ff' }}>
              {t('app.title')}
            </Text>
          </div>
          <MenuComponent />
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Space>
            {/* 移动端菜单按钮 */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setDrawerVisible(true)}
              />
            )}
            <Text strong style={{ color: '#1890ff' }}>
              {isMobile ? t('app.title') : t('admin.title')}
            </Text>
          </Space>
          
          <HeaderActions />
        </Header>

        <Content
          style={{
            padding: 0,
            background: '#f5f5f5',
            overflow: 'hidden'
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          title={t('menu.nav')}
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          bodyStyle={{ padding: 0 }}
          width={250}
        >
          <MenuComponent />
        </Drawer>
      )}
    </Layout>
  )
}
