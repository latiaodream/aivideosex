import React, { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Space, message } from 'antd'
import { settingsAPI } from '../utils/api'

export default function SettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await settingsAPI.getSettings()
      form.setFieldsValue({
        PAY_TRON_ADDRESSES: data.PAY_TRON_ADDRESSES || '',
        PAY_BSC_ADDRESSES: data.PAY_BSC_ADDRESSES || '',
        TRONSCAN_API_KEY: data.TRONSCAN_API_KEY || '',
        BSCSCAN_API_KEY: data.BSCSCAN_API_KEY || '',
        PAYMENT_NOTIFY_URL: data.PAYMENT_NOTIFY_URL || '',
        PAYMENT_NOTIFY_SECRET: data.PAYMENT_NOTIFY_SECRET || ''
      })
    } catch (e) {
      message.error('加载设置失败')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const onSave = async (values) => {
    setLoading(true)
    try {
      await settingsAPI.updateSettings(values)
      message.success('设置已保存')
    } catch (e) {
      message.error('保存失败')
    }
    setLoading(false)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h3 className="page-title">支付与节点设置</h3>
        <Space>
          <Button onClick={load} loading={loading}>刷新</Button>
          <Button type="primary" onClick={() => form.submit()} loading={loading}>保存</Button>
        </Space>
      </div>

      <Card>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="PAY_TRON_ADDRESSES" label="TRON 收款地址池 (逗号分隔)">
            <Input.TextArea rows={3} placeholder="TRXxxxx1,TRXxxxx2"/>
          </Form.Item>
          <Form.Item name="PAY_BSC_ADDRESSES" label="BSC 收款地址池 (逗号分隔)">
            <Input.TextArea rows={3} placeholder="0xabc...,0xdef..."/>
          </Form.Item>

          <Form.Item name="TRONSCAN_API_KEY" label="TronScan API Key">
            <Input placeholder="可选，用于自动对账"/>
          </Form.Item>
          <Form.Item name="BSCSCAN_API_KEY" label="BscScan API Key">
            <Input placeholder="可选，用于自动对账"/>
          </Form.Item>

          <Form.Item name="PAYMENT_NOTIFY_URL" label="支付回调地址（POST JSON）">
            <Input placeholder="例如：https://your.site/api/payment/callback"/>
          </Form.Item>
          <Form.Item name="PAYMENT_NOTIFY_SECRET" label="回调签名密钥（可选）">
            <Input placeholder="用于 HMAC-SHA256 签名，Header: X-Signature"/>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
              <Button onClick={load}>刷新</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
