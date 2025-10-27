import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Divider
} from 'antd'
import { 
  PlusOutlined,
  EditOutlined, 
  DragOutlined,
  CheckOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { planAPI } from '../utils/api'

const { Title, Text } = Typography
const { TextArea } = Input

export default function PlansPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form] = Form.useForm()

  // 加载套餐数据
  const loadPlans = async () => {
    setLoading(true)
    try {
      const data = await planAPI.getPlans()
      setPlans(data || [])
    } catch (error) {
      message.error('加载套餐数据失败')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPlans()
  }, [])

  // 处理创建套餐
  const handleCreate = () => {
    setEditingPlan(null)
    form.resetFields()
    // 设置默认值
    form.setFieldsValue({
      isActive: true,
      sort: plans.length + 1
    })
    setModalVisible(true)
  }

  // 处理编辑套餐
  const handleEdit = (plan) => {
    setEditingPlan(plan)
    form.setFieldsValue(plan)
    setModalVisible(true)
  }

  // 处理表单提交
  const handleSubmit = async (values) => {
    try {
      if (editingPlan) {
        await planAPI.updatePlan(editingPlan.id, values)
        message.success('套餐更新成功')
      } else {
        await planAPI.createPlan(values)
        message.success('套餐创建成功')
      }
      setModalVisible(false)
      loadPlans()
    } catch (error) {
      message.error(editingPlan ? '更新套餐失败' : '创建套餐失败')
    }
  }

  // 处理状态切换
  const handleStatusToggle = async (plan) => {
    try {
      await planAPI.updatePlan(plan.id, {
        ...plan,
        isActive: !plan.isActive
      })
      message.success(`套餐已${plan.isActive ? '下架' : '上架'}`)
      loadPlans()
    } catch (error) {
      message.error('状态更新失败')
    }
  }

  // 套餐代码选项
  const planCodeOptions = [
    { label: '高级版 (ADV)', value: 'ADV' },
    { label: '超级版 (SUP)', value: 'SUP' },
    { label: '终极版 (ULT)', value: 'ULT' },
    { label: '至尊版 (SUPR)', value: 'SUPR' }
  ]

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      fixed: 'left'
    },
    {
      title: '模板',
      width: 110,
      render: (record) => (
        <Space size="small">
          {record.afterPay_zh ? <Tag color="green">ZH</Tag> : <Tag>-ZH-</Tag>}
          {record.afterPay_en ? <Tag color="blue">EN</Tag> : <Tag>-EN-</Tag>}
          {record.afterPay_es ? <Tag color="volcano">ES</Tag> : <Tag>-ES-</Tag>}
        </Space>
      )
    },
    {
      title: t('plans.code'),
      dataIndex: 'code',
      width: 80,
      render: (code) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {code}
        </Tag>
      )
    },
    {
      title: t('plans.name'),
      width: 150,
      render: (_, record) => (
        <div>
          <div><Text strong>{record.name_zh}</Text></div>
          <div><Text type="secondary" style={{ fontSize: '12px' }}>{record.name_en || '-'}</Text></div>
          <div><Text type="secondary" style={{ fontSize: '12px' }}>{record.name_es || '-'}</Text></div>
        </div>
      )
    },
    {
      title: t('plans.price'),
      dataIndex: 'priceUSDT',
      width: 100,
      render: (price) => (
        <Text strong style={{ color: '#52c41a' }}>
          ${price}
        </Text>
      )
    },
    {
      title: t('plans.creditGrant'),
      dataIndex: 'creditGrant',
      width: 100,
      render: (credits) => (
        <Tag color="gold">{credits}</Tag>
      )
    },
    {
      title: t('plans.sort'),
      dataIndex: 'sort',
      width: 80,
      render: (sort) => (
        <Tag color="default">
          <DragOutlined /> {sort}
        </Tag>
      )
    },
    {
      title: t('plans.isActive'),
      dataIndex: 'isActive',
      width: 100,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          checkedChildren={<CheckOutlined />}
          unCheckedChildren={<CloseOutlined />}
          onChange={() => handleStatusToggle(record)}
          size="small"
        />
      )
    },
    {
      title: t('common.actions'),
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} className="page-title">
          {t('plans.title')}
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            {t('plans.createPlan')}
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={plans}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800, y: 'calc(100vh - 300px)' }}
          size="small"
          pagination={false}
        />
      </Card>

      {/* 创建/编辑套餐弹窗 */}
      <Modal
        title={editingPlan ? t('plans.editPlan') : t('plans.createPlan')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ isActive: true, sort: 1 }}
        >
          <Form.Item
            name="code"
            label={t('plans.code')}
            rules={[{ required: true, message: '请选择套餐代码' }]}
          >
            <Input placeholder="如：ADV/SUP/ULT/SUPR" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="name_zh"
              label={`${t('plans.name')} (${t('plans.chinese')})`}
              rules={[{ required: true, message: '请输入中文名称' }]}
            >
              <Input placeholder="如：高级版" />
            </Form.Item>

            <Form.Item
              name="name_en"
              label={`${t('plans.name')} (${t('plans.english')})`}
              rules={[{ required: true, message: '请输入英文名称' }]}
            >
              <Input placeholder="如：Advanced" />
            </Form.Item>

            <Form.Item
              name="name_es"
              label={`${t('plans.name')} (${t('plans.spanish')})`}
              rules={[{ required: true, message: '请输入西班牙语名称' }]}
            >
              <Input placeholder="如：Avanzado" />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="priceUSDT"
              label={t('plans.price')}
              rules={[{ required: true, message: '请输入价格' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={0.01}
                placeholder="10"
                addonAfter="USDT"
              />
            </Form.Item>

            <Form.Item
              name="creditGrant"
              label={t('plans.creditGrant')}
              rules={[{ required: true, message: '请输入赠送点数' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="100"
                addonAfter="积分"
              />
            </Form.Item>

            <Form.Item
              name="sort"
              label={t('plans.sort')}
              rules={[{ required: true, message: '请输入排序' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                placeholder="1"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="isActive"
            label={t('plans.isActive')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Divider orientation="left">{t('plans.postpayMessage')}</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="postpay_zh"
              label={`${t('plans.postpayMessage')} (${t('plans.chinese')})`}
              rules={[{ required: true, message: '请输入付费后提示语' }]}
            >
              <TextArea
                rows={3}
                placeholder="已完成基础匹配。如结果不理想，建议上传更清晰图片或升级【超级版】。"
              />
            </Form.Item>

            <Form.Item
              name="postpay_en"
              label={`${t('plans.postpayMessage')} (${t('plans.english')})`}
              rules={[{ required: true, message: '请输入英文付费后提示语' }]}
            >
              <TextArea
                rows={3}
                placeholder="Basic matching completed. Consider upgrading for broader coverage."
              />
            </Form.Item>

            <Form.Item
              name="postpay_es"
              label={`${t('plans.postpayMessage')} (${t('plans.spanish')})`}
              rules={[{ required: true, message: '请输入西班牙语付费后提示语' }]}
            >
              <TextArea
                rows={3}
                placeholder="Emparejamiento básico completado. Mejora para mayor cobertura."
              />
            </Form.Item>
          </div>

          <Divider orientation="left">{t('plans.upsellMessage')}</Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <Form.Item
              name="upsell_zh"
              label={`${t('plans.upsellMessage')} (${t('plans.chinese')})`}
              rules={[{ required: true, message: '请输入升级引导语' }]}
            >
              <TextArea
                rows={2}
                placeholder="想要更高命中率？试试【超级版】。"
              />
            </Form.Item>

            <Form.Item
              name="upsell_en"
              label={`${t('plans.upsellMessage')} (${t('plans.english')})`}
              rules={[{ required: true, message: '请输入英文升级引导语' }]}
            >
              <TextArea
                rows={2}
                placeholder="Want higher hit rates? Try the Super plan."
              />
            </Form.Item>

            <Form.Item
              name="upsell_es"
              label={`${t('plans.upsellMessage')} (${t('plans.spanish')})`}
              rules={[{ required: true, message: '请输入西班牙语升级引导语' }]}
            >
              <TextArea
                rows={2}
                placeholder="¿Buscas más aciertos? Prueba el plan Super." />
            </Form.Item>
          </div>

          <Divider orientation="left">付费后展示模板（JSON）</Divider>

          <Form.Item
            name="afterPay_zh"
            label="afterPay（中文JSON）"
            tooltip={`示例: {"title":"完成","subtitle":"提示","text":"...","bullets":["要点1","要点2"],"cta":{"text":"继续"},"nextUpsell":{"show":true}}`}
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  try { JSON.parse(value) } catch (e) { return Promise.reject(new Error('请输入合法的 JSON')) }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <TextArea rows={4} placeholder='{"title":"🎯 基础匹配完成","subtitle":"建议升级","bullets":["更高命中率","更多结果"],"nextUpsell":{"show":true}}' />
          </Form.Item>

          <Form.Item
            name="afterPay_en"
            label="afterPay（English JSON）"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  try { JSON.parse(value) } catch (e) { return Promise.reject(new Error('Please provide valid JSON')) }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <TextArea rows={4} placeholder='{"title":"Completed","text":"Consider upgrading","nextUpsell":{"show":true}}' />
          </Form.Item>

          <Form.Item
            name="afterPay_es"
            label="afterPay（Español JSON）"
            rules={[
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve()
                  try { JSON.parse(value) } catch (e) { return Promise.reject(new Error('Por favor ingresa un JSON válido')) }
                  return Promise.resolve()
                }
              }
            ]}
          >
            <TextArea rows={4} placeholder='{"title":"Completado","text":"Considera actualizar","nextUpsell":{"show":true}}' />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPlan ? t('common.save') : t('common.add')}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
