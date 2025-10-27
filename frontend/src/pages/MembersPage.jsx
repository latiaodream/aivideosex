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
  Descriptions
} from 'antd'
import { 
  SearchOutlined, 
  EditOutlined, 
  EyeOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { userAPI } from '../utils/api'

const { Title } = Typography
const { RangePicker } = DatePicker

export default function MembersPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })
  
  const [filters, setFilters] = useState({
    keyword: '',
    country: '',
    device: '',
    status: '',
    paid: ''
  })
  
  const [detailVisible, setDetailVisible] = useState(false)
  const [creditVisible, setCreditVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [createVisible, setCreateVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  const [creditForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [createForm] = Form.useForm()

  // 加载数据
  const loadData = async (page = 1, pageSize = 20, filterParams = filters) => {
    setLoading(true)
    try {
      const params = {
        page,
        pageSize,
        ...filterParams
      }
      
      const response = await userAPI.getUsers(params)
      
      setUsers(response.data || [])
      setPagination({
        current: response.page || 1,
        pageSize: response.pageSize || 20,
        total: response.total || 0
      })
    } catch (error) {
      message.error('加载用户数据失败')
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
      keyword: '',
      country: '',
      device: '',
      status: '',
      paid: ''
    }
    setFilters(resetFilters)
    loadData(1, pagination.pageSize, resetFilters)
  }

  // 处理分页变化
  const handleTableChange = (paginationInfo) => {
    loadData(paginationInfo.current, paginationInfo.pageSize, filters)
  }

  // 查看用户详情
  const handleViewDetail = async (user) => {
    try {
      const userDetail = await userAPI.getUser(user.id)
      setSelectedUser(userDetail)
      setDetailVisible(true)
    } catch (error) {
      message.error('获取用户详情失败')
    }
  }

  // 调整积分
  const handleCreditAdjust = (user) => {
    setSelectedUser(user)
    setCreditVisible(true)
    creditForm.resetFields()
  }

  // 编辑用户
  const handleEditUser = (user) => {
    setSelectedUser(user)
    setEditVisible(true)
    editForm.setFieldsValue({
      tags: user.tags || [],
      status: user.status
    })
  }

  // 创建用户
  const handleCreateUser = async (values) => {
    try {
      await userAPI.createUser(values)
      message.success('会员创建成功')
      setCreateVisible(false)
      createForm.resetFields()
      loadData(1, pagination.pageSize, filters)
    } catch (error) {
      message.error('创建会员失败')
    }
  }

  // 提交积分调整
  const handleCreditSubmit = async (values) => {
    try {
      await userAPI.adjustCredit(selectedUser.id, values)
      message.success('积分调整成功')
      setCreditVisible(false)
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('积分调整失败')
    }
  }

  // 提交用户编辑
  const handleEditSubmit = async (values) => {
    try {
      await userAPI.updateUser(selectedUser.id, values)
      message.success('用户信息更新成功')
      setEditVisible(false)
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('更新用户信息失败')
    }
  }

  // 生成测试用户
  const handleGenerateTestUsers = async () => {
    try {
      const response = await fetch('/api/admin/generate-test-users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        message.success(`${result.message}`)
        loadData(pagination.current, pagination.pageSize, filters)
      } else {
        message.error('生成测试用户失败')
      }
    } catch (error) {
      message.error('生成测试用户失败')
    }
  }

  // 更新用户状态
  const handleUpdateStatus = async (userId, newStatus) => {
    try {
      await userAPI.updateUser(userId, { status: newStatus })
      message.success('用户状态更新成功')
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('更新用户状态失败')
    }
  }

  // 更新用户标签
  const handleUpdateTags = async (userId, tags) => {
    try {
      await userAPI.updateUser(userId, { tags })
      message.success('用户标签更新成功')
      loadData(pagination.current, pagination.pageSize, filters)
    } catch (error) {
      message.error('更新用户标签失败')
    }
  }

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      fixed: 'left',
      sorter: true
    },
    {
      title: '账号',
      dataIndex: 'account',
      width: 180,
      render: (text) => (
        <code style={{ fontSize: '11px', color: '#555' }}>{text || '-'}</code>
      )
    },
    {
      title: t('members.registerTime'),
      dataIndex: 'registeredAt',
      width: 140,
      render: (text) => dayjs(text).format('MM-DD HH:mm'),
      sorter: true
    },
    {
      title: t('members.device'),
      dataIndex: 'registerDevice',
      width: 100,
      render: (text) => (
        <Tag color="geekblue" style={{ fontSize: '11px' }}>
          {text || 'Unknown'}
        </Tag>
      )
    },
    {
      title: t('members.country'),
      dataIndex: 'countryCode',
      width: 100,
      render: (text) => (
        <Tag color="blue" style={{ fontSize: '11px' }}>
          {text || 'Unknown'}
        </Tag>
      ),
      filters: [
        { text: '中国', value: 'CN' },
        { text: '美国', value: 'US' },
        { text: '日本', value: 'JP' },
        { text: '韩国', value: 'KR' },
        { text: '其他', value: 'OTHER' }
      ]
    },
    {
      title: t('members.registerIp'),
      dataIndex: 'registerIp',
      width: 120,
      render: (text) => (
        <code style={{ fontSize: '11px', color: '#666' }}>
          {text || '-'}
        </code>
      )
    },
    {
      title: t('members.lastLoginIp'),
      dataIndex: 'lastLoginIp',
      width: 120,
      render: (text) => (
        <code style={{ fontSize: '11px', color: '#666' }}>
          {text || '-'}
        </code>
      )
    },
    {
      title: t('members.lastLogin'),
      dataIndex: 'lastLoginAt',
      width: 140,
      render: (text) => text ? dayjs(text).format('MM-DD HH:mm') : '-',
      sorter: true
    },
    {
      title: t('members.creditBalance'),
      dataIndex: 'creditBalance',
      width: 100,
      render: (text) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{text}</span>
      ),
      sorter: true
    },
    {
      title: t('members.totalSpent'),
      dataIndex: 'totalSpentUSDT',
      width: 120,
      render: (text) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
          ${Number(text).toFixed(2)}
        </span>
      ),
      sorter: true
    },
    {
      title: t('members.tags'),
      dataIndex: 'tags',
      width: 120,
      render: (tags) => (
        <div>
          {tags && tags.length > 0 ? (
            tags.map((tag, index) => (
              <Tag key={index} color="orange" style={{ fontSize: '10px', margin: '1px' }}>
                {tag}
              </Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
        </div>
      )
    },
    {
      title: t('members.status'),
      dataIndex: 'status',
      width: 100,
      render: (status, record) => (
        <Select
          value={status}
          size="small"
          style={{ width: 80 }}
          onChange={(value) => handleUpdateStatus(record.id, value)}
        >
          <Select.Option value="active">
            <Tag color="green" style={{ margin: 0 }}>正常</Tag>
          </Select.Option>
          <Select.Option value="banned">
            <Tag color="red" style={{ margin: 0 }}>封禁</Tag>
          </Select.Option>
        </Select>
      ),
      filters: [
        { text: '正常', value: 'active' },
        { text: '封禁', value: 'banned' }
      ]
    },
    {
      title: t('common.actions'),
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            title="查看详情"
          />
          <Button
            size="small"
            type="text"
            icon={<DollarOutlined />}
            onClick={() => handleCreditAdjust(record)}
            title="调整积分"
          />
          <Button
            size="small"
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
            title="编辑用户"
          />
        </Space>
      )
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} className="page-title">
          {t('members.title')}
        </Title>
        {/* 刷新按钮移除 */}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="toolbar">
          <Input.Search
            placeholder="搜索账号或ID"
            value={filters.keyword}
            onChange={(e) => setFilters({...filters, keyword: e.target.value})}
            onSearch={handleSearch}
            style={{ width: 200 }}
            allowClear
          />
          
          <Select
            placeholder="选择国家"
            value={filters.country}
            onChange={(value) => setFilters({...filters, country: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="CN">中国</Select.Option>
            <Select.Option value="US">美国</Select.Option>
            <Select.Option value="JP">日本</Select.Option>
            <Select.Option value="KR">韩国</Select.Option>
          </Select>
          
          <Select
            placeholder="设备类型"
            value={filters.device}
            onChange={(value) => setFilters({...filters, device: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="iOS">iOS</Select.Option>
            <Select.Option value="Android">Android</Select.Option>
            <Select.Option value="Web">Web</Select.Option>
          </Select>
          
          <Select
            placeholder="账号状态"
            value={filters.status}
            onChange={(value) => setFilters({...filters, status: value})}
            style={{ width: 120 }}
            allowClear
          >
            <Select.Option value="active">正常</Select.Option>
            <Select.Option value="banned">封禁</Select.Option>
          </Select>
          
          {/* 移除重置按钮，界面更简洁 */}
          
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            {t('common.search')}
          </Button>

          <Button
            type="primary"
            onClick={handleGenerateTestUsers}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            生成测试用户
          </Button>

          <Button
            type="primary"
            onClick={() => setCreateVisible(true)}
          >
            新增会员
          </Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200, y: 'calc(100vh - 350px)' }}
          size="small"
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={600}
      >
        {selectedUser && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="用户ID">{selectedUser.id}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(selectedUser.registeredAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最近登录">
                {selectedUser.lastLoginAt ?
                  dayjs(selectedUser.lastLoginAt).format('YYYY-MM-DD HH:mm:ss') :
                  '从未登录'
                }
              </Descriptions.Item>
              <Descriptions.Item label="注册设备">
                <Tag color="geekblue">{selectedUser.registerDevice || 'Unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="注册IP">
                <code style={{ fontSize: '12px', color: '#666' }}>
                  {selectedUser.registerIp || '未知'}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="国家地区">
                <Tag color="blue">{selectedUser.countryCode || 'Unknown'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最近登录IP">
                <code style={{ fontSize: '12px', color: '#666' }}>
                  {selectedUser.lastLoginIp || '未知'}
                </code>
              </Descriptions.Item>
              <Descriptions.Item label="积分余额">
                <span style={{ color: '#52c41a', fontWeight: 'bold', fontSize: '16px' }}>
                  {selectedUser.creditBalance}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="累计消费">
                <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '16px' }}>
                  ${Number(selectedUser.totalSpentUSDT).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="用户标签">
                {selectedUser.tags && selectedUser.tags.length > 0 ? (
                  selectedUser.tags.map((tag, index) => (
                    <Tag key={index} color="orange">{tag}</Tag>
                  ))
                ) : (
                  <span style={{ color: '#999' }}>无标签</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="账户状态">
                <Tag color={selectedUser.status === 'active' ? 'green' : 'red'}>
                  {selectedUser.status === 'active' ? '正常' : '封禁'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* 最近订单 */}
            {selectedUser.Orders && selectedUser.Orders.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>最近订单</Title>
                <Table
                  dataSource={selectedUser.Orders}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '订单号',
                      dataIndex: 'orderNo',
                      width: 120,
                      render: (text) => <code style={{ fontSize: '11px' }}>{text}</code>
                    },
                    {
                      title: '套餐',
                      dataIndex: 'plan',
                      width: 80,
                      render: (plan) => plan?.name_zh || '-'
                    },
                    {
                      title: '金额',
                      dataIndex: 'amountDue',
                      width: 80,
                      render: (amount) => `$${amount}`
                    },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      width: 80,
                      render: (status) => {
                        const statusMap = {
                          pending: { color: 'orange', text: '待付' },
                          seen: { color: 'blue', text: '已见' },
                          confirmed: { color: 'green', text: '已确认' },
                          credited: { color: 'green', text: '已到账' },
                          failed: { color: 'red', text: '失败' },
                          expired: { color: 'gray', text: '过期' }
                        }
                        const config = statusMap[status] || { color: 'gray', text: status }
                        return <Tag color={config.color}>{config.text}</Tag>
                      }
                    },
                    {
                      title: '时间',
                      dataIndex: 'createdAt',
                      width: 100,
                      render: (time) => dayjs(time).format('MM-DD HH:mm')
                    }
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 积分调整弹窗 */}
      <Modal
        title="调整积分"
        open={creditVisible}
        onCancel={() => setCreditVisible(false)}
        footer={null}
      >
        <Form
          form={creditForm}
          onFinish={handleCreditSubmit}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label="调整金额"
            rules={[{ required: true, message: '请输入调整金额' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="正数为增加，负数为减少"
              min={-9999}
              max={9999}
            />
          </Form.Item>
          
          <Form.Item
            name="reason"
            label="调整原因"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input.TextArea placeholder="请输入调整原因" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认调整
              </Button>
              <Button onClick={() => setCreditVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户编辑弹窗 */}
      <Modal
        title="编辑用户"
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          onFinish={handleEditSubmit}
          layout="vertical"
        >
          <Form.Item
            name="status"
            label="账户状态"
            rules={[{ required: true, message: '请选择账户状态' }]}
          >
            <Select placeholder="请选择账户状态">
              <Select.Option value="active">
                <Tag color="green">正常</Tag>
              </Select.Option>
              <Select.Option value="banned">
                <Tag color="red">封禁</Tag>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="用户标签"
          >
            <Select
              mode="tags"
              placeholder="请输入用户标签"
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            >
              <Select.Option value="VIP">VIP</Select.Option>
              <Select.Option value="高价值用户">高价值用户</Select.Option>
              <Select.Option value="风险用户">风险用户</Select.Option>
              <Select.Option value="测试用户">测试用户</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存修改
              </Button>
              <Button onClick={() => setEditVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建会员弹窗 */}
      <Modal
        title="新增会员"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false)
          createForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
          initialValues={{
            registerDevice: 'Web',
            status: 'active',
            creditBalance: 0
          }}
        >
          <Form.Item
            name="registerIp"
            label="注册IP"
            tooltip="用于生成会员账号，建议填写用户真实 IP"
            rules={[{ required: true, message: '请输入注册 IP' }]}
          >
            <Input placeholder="例如：203.208.60.1" />
          </Form.Item>

          <Form.Item
            name="registerDevice"
            label="注册设备"
            rules={[{ required: true, message: '请选择注册设备' }]}
          >
            <Select>
              <Select.Option value="iOS">iOS</Select.Option>
              <Select.Option value="Android">Android</Select.Option>
              <Select.Option value="Web">Web</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="countryCode"
            label="国家/地区"
          >
            <Select allowClear placeholder="可选">
              <Select.Option value="CN">中国</Select.Option>
              <Select.Option value="US">美国</Select.Option>
              <Select.Option value="JP">日本</Select.Option>
              <Select.Option value="KR">韩国</Select.Option>
              <Select.Option value="SG">新加坡</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="creditBalance"
            label="初始积分"
            rules={[{ type: 'number', min: 0, message: '积分不能为负' }]}
          >
            <InputNumber style={{ width: '100%' }} placeholder="默认 0" min={0} max={999999} />
          </Form.Item>

          <Form.Item
            name="status"
            label="账号状态"
            rules={[{ required: true, message: '请选择账号状态' }]}
          >
            <Select>
              <Select.Option value="active">正常</Select.Option>
              <Select.Option value="banned">封禁</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="tags"
            label="会员标签"
          >
            <Select mode="tags" placeholder="可选，按回车确认" tokenSeparators={[',']} allowClear />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={() => {
                setCreateVisible(false)
                createForm.resetFields()
              }}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
