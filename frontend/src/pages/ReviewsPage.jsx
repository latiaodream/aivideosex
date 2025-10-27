import React, { useState, useEffect } from 'react'
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Input, 
  Select,
  DatePicker,
  message,
  Modal,
  Form,
  InputNumber,
  Rate,
  Switch,
  Avatar,
  Image,
  Tooltip,
  Popconfirm,
  Row,
  Col
} from 'antd'
import { 
  StarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  PushpinOutlined,
  CheckCircleOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { reviewAPI, toolsAPI } from '../utils/api'

const { Title, Text } = Typography
const { TextArea } = Input

export default function ReviewsPage() {
  const { t } = useTranslation()
  
  // 状态管理
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  
  // 筛选条件
  const [filters, setFilters] = useState({
    status: '',
    sourceType: '',
    stars: '',
    language: ''
  })
  
  // 模态框状态
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [form] = Form.useForm()
  const [translating, setTranslating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // 加载数据
  const loadData = async (page = 1, pageSize = 20, filterParams = filters) => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
        ...filterParams
      }
      
      const response = await reviewAPI.getReviews(params)
      
      setReviews(response.data || [])
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0
      })
    } catch (error) {
      message.error('加载评价数据失败')
    }
    setLoading(false)
  }

  // 处理搜索
  const handleSearch = () => {
    loadData(1, pagination.pageSize, filters)
  }

  // 处理重置
  const handleReset = () => {
    const resetFilters = {
      status: '',
      sourceType: '',
      stars: '',
      language: ''
    }
    setFilters(resetFilters)
    loadData(1, pagination.pageSize, resetFilters)
  }

  // 处理分页变化
  const handleTableChange = (paginationInfo) => {
    loadData(paginationInfo.current, paginationInfo.pageSize, filters)
  }

  // 新增评价
  const handleAdd = () => {
    setEditingReview(null)
    form.resetFields()
    form.setFieldsValue({
      stars: 5,
      sourceType: 'demo',
      language: 'zh-CN',
      status: 'draft',
      verified: false,
      pinned: false,
      sort: 0,
      content_zh: '',
      content_en: '',
      content_es: ''
    })
    setModalVisible(true)
  }

  // 编辑评价
  const handleEdit = (review) => {
    setEditingReview(review)
    form.setFieldsValue({
      ...review,
      startAt: review.startAt ? dayjs(review.startAt) : null,
      endAt: review.endAt ? dayjs(review.endAt) : null
    })
    setModalVisible(true)
  }

  const handleTranslateToSpanish = async () => {
    const zhContent = form.getFieldValue('content_zh')
    if (!zhContent || !zhContent.trim()) {
      message.warning('请先填写中文评价内容')
      return
    }
    setTranslating(true)
    try {
      const result = await toolsAPI.translate(zhContent, 'zh', 'es')
      const translatedText = result?.translatedText || result?.translation
      if (translatedText) {
        form.setFieldsValue({ content_es: translatedText })
        if (result?.warning) {
          message.warning(result.warning)
        } else {
          message.success('已自动翻译成西班牙语')
        }
      } else {
        message.error('未获取到翻译结果')
      }
    } catch (error) {
      message.error('自动翻译失败')
    }
    setTranslating(false)
  }

  // 提交表单
  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        startAt: values.startAt ? values.startAt.toISOString() : null,
        endAt: values.endAt ? values.endAt.toISOString() : null
      }

      if (editingReview) {
        await reviewAPI.updateReview(editingReview.id, data)
        message.success('评价更新成功')
      } else {
        await reviewAPI.createReview(data)
        message.success('评价创建成功')
      }
      
      setModalVisible(false)
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error(editingReview ? '更新评价失败' : '创建评价失败')
    }
  }

  // 删除评价
  const handleDelete = async (id) => {
    try {
      await reviewAPI.deleteReview(id)
      message.success('评价删除成功')
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('删除评价失败')
    }
  }

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      fixed: 'left'
    },
    {
      title: '用户信息',
      width: 150,
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.avatarUrl} 
            icon={<UserOutlined />}
            size="small"
          />
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {record.displayName}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {record.language}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: '评分',
      dataIndex: 'stars',
      width: 120,
      render: (stars) => (
        <Rate disabled value={stars} style={{ fontSize: '14px' }} />
      ),
      sorter: (a, b) => a.stars - b.stars
    },
    {
      title: '内容预览',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '4px' }}>
            <Text ellipsis={{ tooltip: record.content_zh }}>
              🇨🇳 {record.content_zh}
            </Text>
          </div>
          <div style={{ fontSize: '12px' }}>
            <Text ellipsis={{ tooltip: record.content_en }}>
              🇺🇸 {record.content_en}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: '图片',
      dataIndex: 'imageUrl',
      width: 80,
      render: (imageUrl) => imageUrl ? (
        <Image
          width={40}
          height={40}
          src={imageUrl}
          style={{ objectFit: 'cover', borderRadius: 4 }}
        />
      ) : '-'
    },
    {
      title: '来源',
      dataIndex: 'sourceType',
      width: 80,
      render: (sourceType) => {
        const colors = {
          demo: 'blue',
          beta: 'orange', 
          real: 'green'
        }
        return (
          <Tag color={colors[sourceType] || 'default'}>
            {sourceType?.toUpperCase()}
          </Tag>
        )
      }
    },
    {
      title: '状态',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Tag color={record.status === 'published' ? 'green' : record.status === 'draft' ? 'orange' : 'red'}>
            {record.status === 'published' ? '已发布' : record.status === 'draft' ? '草稿' : '未列出'}
          </Tag>
          <Space size="small">
            {record.verified && (
              <Tooltip title="已验证购买">
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              </Tooltip>
            )}
            {record.pinned && (
              <Tooltip title="置顶">
                <PushpinOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
            )}
          </Space>
        </Space>
      )
    },
    {
      title: '排序',
      dataIndex: 'sort',
      width: 60,
      sorter: (a, b) => a.sort - b.sort
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (createdAt) => dayjs(createdAt).format('MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个评价吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} className="page-title">
          {t('reviews.title')} - 评价管理
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新增评价
        </Button>
      </div>

      <Card>
        {/* 筛选条件 */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(value) => setFilters({...filters, status: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="published">已发布</Select.Option>
            <Select.Option value="draft">草稿</Select.Option>
            <Select.Option value="unlisted">未列出</Select.Option>
          </Select>

          <Select
            placeholder="来源类型"
            value={filters.sourceType}
            onChange={(value) => setFilters({...filters, sourceType: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="demo">Demo</Select.Option>
            <Select.Option value="beta">Beta</Select.Option>
            <Select.Option value="real">Real</Select.Option>
          </Select>

          <Select
            placeholder="评分"
            value={filters.stars}
            onChange={(value) => setFilters({...filters, stars: value})}
            style={{ width: 100 }}
            allowClear
          >
            <Select.Option value="5">5星</Select.Option>
            <Select.Option value="4">4星</Select.Option>
            <Select.Option value="3">3星</Select.Option>
            <Select.Option value="2">2星</Select.Option>
            <Select.Option value="1">1星</Select.Option>
          </Select>

          <Select
            placeholder="语言"
            value={filters.language}
            onChange={(value) => setFilters({...filters, language: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="zh-CN">中文</Select.Option>
            <Select.Option value="en-US">英文</Select.Option>
            <Select.Option value="es-ES">西语</Select.Option>
          </Select>

          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            搜索
          </Button>
          
          {/* 移除重置按钮，界面更简洁 */}
          
          {/* 刷新按钮移除 */}
        </div>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="small"
        />
      </Card>

      {/* 编辑模态框 */}
      <Modal
        title={editingReview ? '编辑评价' : '新增评价'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="显示名称"
                name="displayName"
                rules={[{ required: true, message: '请输入显示名称' }]}
              >
                <Input placeholder="用户显示名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="头像URL"
                name="avatarUrl"
              >
                <Input placeholder="https://example.com/avatar.jpg" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="评分"
                name="stars"
                rules={[{ required: true, message: '请选择评分' }]}
              >
                <Rate />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="来源类型"
                name="sourceType"
                rules={[{ required: true, message: '请选择来源类型' }]}
              >
                <Select>
                  <Select.Option value="demo">Demo</Select.Option>
                  <Select.Option value="beta">Beta</Select.Option>
                  <Select.Option value="real">Real</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="语言"
                name="language"
                rules={[{ required: true, message: '请选择语言' }]}
              >
                <Select>
                  <Select.Option value="zh-CN">中文</Select.Option>
                  <Select.Option value="en-US">英文</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="评价内容(中文)"
                name="content_zh"
                rules={[{ required: true, message: '请输入中文评价内容' }]}
              >
                <TextArea rows={4} placeholder="中文评价内容" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="评价内容(英文)"
                name="content_en"
                rules={[{ required: true, message: '请输入英文评价内容' }]}
              >
                <TextArea rows={4} placeholder="English review content" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={(
                  <Space align="center">
                    <span>评价内容(西班牙语)</span>
                    <Button type="link" size="small" onClick={handleTranslateToSpanish} loading={translating}>
                      自动翻译
                    </Button>
                  </Space>
                )}
                name="content_es"
                rules={[{ required: true, message: '请输入西班牙语评价内容' }]}
              >
                <TextArea rows={4} placeholder="Contenido de la reseña en español" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="评价图片URL"
            name="imageUrl"
          >
            <Input placeholder="https://example.com/review-image.jpg" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Select.Option value="published">已发布</Select.Option>
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="unlisted">未列出</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="排序"
                name="sort"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="关联订单ID"
                name="orderId"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="已验证购买"
                name="verified"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="置顶显示"
                name="pinned"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始时间"
                name="startAt"
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="选择开始时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束时间"
                name="endAt"
              >
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder="选择结束时间"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingReview ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
