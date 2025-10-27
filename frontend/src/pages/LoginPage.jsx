import React, { useState } from 'react'
import { Form, Input, Button, Card, Typography, message, Space, Select } from 'antd'
import { LockOutlined, GlobalOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { setToken } from '../utils/auth'
import { languageOptions } from '../i18n'

const { Title, Text } = Typography

export default function LoginPage({ onLogin }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      // 简单的token验证（实际项目中应该调用后端API）
      const { token } = values
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 基本的token验证
      if (token && token.length >= 8) {
        setToken(token)
        onLogin()
      } else {
        message.error(t('auth.tokenInvalid'))
      }
    } catch (error) {
      message.error(t('auth.loginFailed'))
    }
    setLoading(false)
  }

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language)
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '16px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            AI视频搜索系统
          </Title>
          <Text type="secondary">
            {t('auth.adminToken')}管理后台
          </Text>
        </div>

        <Form
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="token"
            rules={[
              { required: true, message: t('auth.tokenRequired') },
              { min: 8, message: 'Token长度至少8位' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t('auth.adminToken')}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              {t('auth.login')}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          paddingTop: 16,
          textAlign: 'center' 
        }}>
          <Space>
            <GlobalOutlined />
            <Select
              value={i18n.language}
              onChange={handleLanguageChange}
              size="small"
              style={{ width: 120 }}
              options={languageOptions.map(opt => ({
                value: opt.value,
                label: (
                  <Space size={4}>
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </Space>
                )
              }))}
            />
          </Space>
        </div>

        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: 6,
          fontSize: 12
        }}>
          <Text type="secondary">
            <strong>测试Token:</strong> admin_token_2024_dev
            <br />
            <Text type="secondary">
              (用于开发环境测试，生产环境请使用安全的Token)
            </Text>
          </Text>
        </div>
      </Card>
    </div>
  )
}