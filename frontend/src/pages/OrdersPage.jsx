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
  Drawer,
  Descriptions,
  Tooltip,
  Popconfirm
} from 'antd'
import { 
  SearchOutlined, 
  EyeOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { orderAPI } from '../utils/api'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function OrdersPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  
  const [filters, setFilters] = useState({
    status: '',
    chain: '',
    min: '',
    max: '',
    from: '',
    to: ''
  })
  
  const [detailVisible, setDetailVisible] = useState(false)
  const [markPaidVisible, setMarkPaidVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  const [markPaidForm] = Form.useForm()

  // 加载数据
  const loadData = async (page = 1, pageSize = 20, filterParams = filters) => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
        ...filterParams
      }
      
      const response = await orderAPI.getOrders(params)
      
      setOrders(response.data || [])
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0
      })
    } catch (error) {
      message.error('加载订单数据失败')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 处理搜索
  const handleSearch = () => {
    loadData(1, pagination.pageSize, filters)
  }

  // 处理重置
  const handleReset = () => {
    const resetFilters = {
      status: '',
      chain: '',
      min: '',
      max: '',
      from: '',
      to: ''
    }
    setFilters(resetFilters)
    loadData(1, pagination.pageSize, resetFilters)
  }

  // 处理分页变化
  const handleTableChange = (paginationInfo) => {
    loadData(paginationInfo.current, paginationInfo.pageSize, filters)
  }

  // 查看订单详情
  const handleViewDetail = async (order) => {
    try {
      const orderDetail = await orderAPI.getOrder(order.id)
      setSelectedOrder(orderDetail)
      setDetailVisible(true)
    } catch (error) {
      message.error('获取订单详情失败')
    }
  }

  // 标记已付
  const handleMarkPaid = (order) => {
    setSelectedOrder(order)
    setMarkPaidVisible(true)
    markPaidForm.resetFields()
    markPaidForm.setFieldsValue({
      amountPaid: order.amountDue
    })
  }

  // 提交标记已付
  const handleMarkPaidSubmit = async (values) => {
    try {
      await orderAPI.markPaid(selectedOrder.id, values)
      message.success('订单已标记为已付款')
      setMarkPaidVisible(false)
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('标记付款失败')
    }
  }

  // 设为过期
  const handleSetExpired = async (order) => {
    try {
      await orderAPI.setExpired(order.id)
      message.success('订单已设为过期')
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('设置过期失败')
    }
  }

  // 复制到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制到剪贴板')
    }).catch(() => {
      message.error('复制失败')
    })
  }

  // 订单状态配置
  const orderStatus = {
    pending: { color: 'default', text: '待支付' },
    seen: { color: 'processing', text: '已见证' },
    confirmed: { color: 'warning', text: '已确认' },
    credited: { color: 'success', text: '已到账' },
    failed: { color: 'error', text: '失败' },
    expired: { color: 'default', text: '已过期' }
  }

  // 链路配置
  const chainConfig = {
    TRON: { color: 'red', text: 'TRC20' },
    BSC: { color: 'orange', text: 'BSC' },
    ETH: { color: 'blue', text: 'ERC20' }
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
      title: t('orders.orderNo'),
      dataIndex: 'orderNo',
      width: 140,
      fixed: 'left',
      render: (text) => (
        <Tooltip title="点击复制">
          <Text 
            code 
            copyable={{ text, tooltips: false }}
            style={{ fontSize: '11px' }}
          >
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: t('orders.user'),
      width: 120,
      render: (_, record) => (
        <div>
          <div><Text strong>{record.user?.account}</Text></div>
          <div><Text type="secondary" style={{ fontSize: '11px' }}>ID: {record.userId}</Text></div>
        </div>
      )
    },
    {
      title: t('orders.plan'),
      width: 100,
      render: (_, record) => (
        <div>
          <Tag color="blue">{record.plan?.code}</Tag>
          <div style={{ fontSize: '11px', marginTop: 2 }}>
            {record.plan?.name_zh}
          </div>
        </div>
      )
    },
    {
      title: t('orders.amountDue'),
      dataIndex: 'amountDue',
      width: 100,
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          ${amount}
        </Text>
      )
    },
    {
      title: t('orders.amountPaid'),
      dataIndex: 'amountPaid',
      width: 100,
      render: (amount) => (
        amount ? (
          <Text strong style={{ color: '#52c41a' }}>
            ${amount}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: t('orders.chain'),
      dataIndex: 'chain',
      width: 80,
      render: (chain) => {
        const config = chainConfig[chain] || { color: 'default', text: chain }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: t('orders.txHash'),
      dataIndex: 'txHash',
      width: 120,
      render: (hash) => (
        hash ? (
          <Tooltip title="点击复制完整哈希">
            <Text 
              code 
              onClick={() => copyToClipboard(hash)}
              style={{ 
                fontSize: '10px', 
                cursor: 'pointer',
                maxWidth: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block'
              }}
            >
              {hash.slice(0, 8)}...
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: t('orders.status'),
      dataIndex: 'status',
      width: 90,
      render: (status) => {
        const config = orderStatus[status] || { color: 'default', text: status }
        return <Tag color={config.color}>{config.text}</Tag>
      }
    },
    {
      title: t('orders.createTime'),
      dataIndex: 'createdAt',
      width: 120,
      render: (text) => dayjs(text).format('MM-DD HH:mm')
    },
    {
      title: t('common.actions'),
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          />
          {record.status === 'pending' && (
            <Button
              size="small"
              type="text"
              icon={<DollarOutlined />}
              onClick={() => handleMarkPaid(record)}
            />
          )}
          {['pending', 'seen'].includes(record.status) && (
            <Popconfirm
              title="确认设为过期？"
              onConfirm={() => handleSetExpired(record)}
              okText="确认"
              cancelText="取消"
            >
              <Button
                size="small"
                type="text"
                icon={<ClockCircleOutlined />}
                danger
              />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} className="page-title">
          {t('orders.title')}
        </Title>
        {/* 刷新按钮移除 */}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Select
            placeholder="订单状态"
            value={filters.status}
            onChange={(value) => setFilters({...filters, status: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="pending">待支付</Select.Option>
            <Select.Option value="seen">已见证</Select.Option>
            <Select.Option value="confirmed">已确认</Select.Option>
            <Select.Option value="credited">已到账</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
            <Select.Option value="expired">已过期</Select.Option>
          </Select>
          
          <Select
            placeholder="支付链路"
            value={filters.chain}
            onChange={(value) => setFilters({...filters, chain: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="TRON">TRC20</Select.Option>
            <Select.Option value="BSC">BSC</Select.Option>
            <Select.Option value="ETH">ERC20</Select.Option>
          </Select>
          
          <InputNumber
            placeholder="最小金额"
            value={filters.min}
            onChange={(value) => setFilters({...filters, min: value})}
            style={{ width: 120 }}
            min={0}
          />
          
          <InputNumber
            placeholder="最大金额"
            value={filters.max}
            onChange={(value) => setFilters({...filters, max: value})}
            style={{ width: 120 }}
            min={0}
          />
          
          <RangePicker
            value={filters.from && filters.to ? [dayjs(filters.from), dayjs(filters.to)] : null}
            onChange={(dates) => {
              if (dates) {
                setFilters({
                  ...filters,
                  from: dates[0].toISOString(),
                  to: dates[1].toISOString()
                })
              } else {
                setFilters({...filters, from: '', to: ''})
              }
            }}
            style={{ width: 200 }}
          />
          
          {/* 移除重置按钮，界面更简洁 */}
          
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1400, y: 'calc(100vh - 350px)' }}
          size="small"
        />
      </Card>

      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {selectedOrder && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单号">
              <Text code copyable>{selectedOrder.orderNo}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="用户账号">
              {selectedOrder.user?.account} (ID: {selectedOrder.userId})
            </Descriptions.Item>
            <Descriptions.Item label="套餐">
              <Tag color="blue">{selectedOrder.plan?.code}</Tag> {selectedOrder.plan?.name_zh}
            </Descriptions.Item>
            <Descriptions.Item label="应付金额">${selectedOrder.amountDue}</Descriptions.Item>
            <Descriptions.Item label="实付金额">
              {selectedOrder.amountPaid ? `$${selectedOrder.amountPaid}` : '未支付'}
            </Descriptions.Item>
            <Descriptions.Item label="支付链路">
              <Tag color={chainConfig[selectedOrder.chain]?.color}>
                {chainConfig[selectedOrder.chain]?.text || selectedOrder.chain}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="收款地址">
              <Text code copyable={selectedOrder.toAddress ? true : false}>
                {selectedOrder.toAddress || '未设置'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="付款地址">
              <Text code copyable={selectedOrder.fromAddress ? true : false}>
                {selectedOrder.fromAddress || '未知'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="交易哈希">
              <Text code copyable={selectedOrder.txHash ? true : false}>
                {selectedOrder.txHash || '无'}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="确认数">{selectedOrder.confirmations}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={orderStatus[selectedOrder.status]?.color}>
                {orderStatus[selectedOrder.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="支付时间">
              {selectedOrder.paidAt ? dayjs(selectedOrder.paidAt).format('YYYY-MM-DD HH:mm:ss') : '未支付'}
            </Descriptions.Item>
            <Descriptions.Item label="过期时间">
              {selectedOrder.expiresAt ? dayjs(selectedOrder.expiresAt).format('YYYY-MM-DD HH:mm:ss') : '无限制'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* 标记已付弹窗 */}
      <Modal
        title={t('orders.markPaid')}
        open={markPaidVisible}
        onCancel={() => setMarkPaidVisible(false)}
        footer={null}
      >
        <Form
          form={markPaidForm}
          onFinish={handleMarkPaidSubmit}
          layout="vertical"
        >
          <Form.Item
            name="amountPaid"
            label="实际支付金额"
            rules={[{ required: true, message: '请输入实际支付金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={0.01}
              addonAfter="USDT"
            />
          </Form.Item>
          
          <Form.Item
            name="txHash"
            label="交易哈希"
            rules={[{ required: true, message: '请输入交易哈希' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
          
          <Form.Item
            name="fromAddress"
            label="付款地址"
          >
            <Input placeholder="付款方地址" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<CheckCircleOutlined />}>
                确认标记已付
              </Button>
              <Button onClick={() => setMarkPaidVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
