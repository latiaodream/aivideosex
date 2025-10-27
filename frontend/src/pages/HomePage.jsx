import React, { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  DatePicker,
  InputNumber,
  Space,
  Popconfirm,
  message,
  Tag,
  Image,
  Row,
  Col,
  Upload,
  Progress,
  Flex
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PictureOutlined,
  FileTextOutlined,
  TableOutlined,
  UploadOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { bannerAPI, textBlockAPI, planAPI, uploadAPI } from '../utils/api'
import dayjs from 'dayjs'

const { Title } = Typography
const { TextArea } = Input

export default function HomePage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('banners')
  
  // 轮播图相关状态
  const [banners, setBanners] = useState([])
  const [bannersLoading, setBannersLoading] = useState(false)
  const [bannerModalVisible, setBannerModalVisible] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [bannerForm] = Form.useForm()

  // 图片上传相关状态
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // 文本区块相关状态
  const [textBlocks, setTextBlocks] = useState([])
  const [textBlocksLoading, setTextBlocksLoading] = useState(false)
  const [textBlockModalVisible, setTextBlockModalVisible] = useState(false)
  const [editingTextBlock, setEditingTextBlock] = useState(null)
  const [textBlockForm] = Form.useForm()
  
  // 套餐数据（只读展示）
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)

  useEffect(() => {
    loadBanners()
    loadTextBlocks()
    loadPlans()
  }, [])

  // 加载轮播图数据
  const loadBanners = async () => {
    setBannersLoading(true)
    try {
      const data = await bannerAPI.getBanners()
      setBanners(data)
    } catch (error) {
      message.error('加载轮播图失败')
    }
    setBannersLoading(false)
  }

  // 加载文本区块数据
  const loadTextBlocks = async () => {
    setTextBlocksLoading(true)
    try {
      const data = await textBlockAPI.getTextBlocks()
      setTextBlocks(data)
    } catch (error) {
      message.error('加载文本区块失败')
    }
    setTextBlocksLoading(false)
  }

  // 加载套餐数据
  const loadPlans = async () => {
    setPlansLoading(true)
    try {
      const data = await planAPI.getPlans()
      setPlans(data)
    } catch (error) {
      message.error('加载套餐数据失败')
    }
    setPlansLoading(false)
  }

  // ========== 轮播图管理 ==========
  
  // 新增轮播图
  const handleAddBanner = () => {
    setEditingBanner(null)
    setBannerModalVisible(true)
    // 延迟重置表单，确保Modal已经渲染
    setTimeout(() => {
      bannerForm.resetFields()
    }, 0)
  }

  // 编辑轮播图
  const handleEditBanner = (banner) => {
    setEditingBanner(banner)
    bannerForm.setFieldsValue({
      ...banner,
      startAt: banner.startAt ? dayjs(banner.startAt) : null,
      endAt: banner.endAt ? dayjs(banner.endAt) : null
    })
    setBannerModalVisible(true)
  }

  // 提交轮播图表单
  const handleBannerSubmit = async (values) => {
    try {
      const data = {
        ...values,
        startAt: values.startAt ? values.startAt.toISOString() : null,
        endAt: values.endAt ? values.endAt.toISOString() : null
      }

      if (editingBanner) {
        await bannerAPI.updateBanner(editingBanner.id, data)
        message.success('轮播图更新成功')
      } else {
        await bannerAPI.createBanner(data)
        message.success('轮播图创建成功')
      }
      
      setBannerModalVisible(false)
      loadBanners()
    } catch (error) {
      message.error(editingBanner ? '更新轮播图失败' : '创建轮播图失败')
    }
  }

  // 删除轮播图
  const handleDeleteBanner = async (id) => {
    try {
      await bannerAPI.deleteBanner(id)
      message.success('轮播图删除成功')
      loadBanners()
    } catch (error) {
      message.error('删除轮播图失败')
    }
  }

  // 图片上传处理
  const handleImageUpload = async (file) => {
    try {
      setUploadLoading(true)
      setUploadProgress(0)

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // 注意：我们的 axios 实例已在拦截器中返回 response.data
      const res = await uploadAPI.uploadImage(file)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (res && res.success) {
        const imageUrl = res.url
        // 更新表单中的图片URL
        bannerForm.setFieldsValue({ imageUrl })
        // 触发表单字段校验，刷新预览
        bannerForm.validateFields(['imageUrl']).catch(() => {})
        message.success('图片上传成功')
        return imageUrl
      }
      throw new Error(res?.message || '上传失败')
    } catch (error) {
      console.error('图片上传失败:', error)
      // 拦截器已经提示过，这里兜底
      message.error(error?.message || '图片上传失败')
      throw error
    } finally {
      setUploadLoading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  // 上传前的验证
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件!')
      return false
    }

    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('图片大小不能超过10MB!')
      return false
    }

    return true
  }

  // ========== 文本区块管理 ==========
  
  // 新增文本区块
  const handleAddTextBlock = () => {
    setEditingTextBlock(null)
    textBlockForm.resetFields()
    setTextBlockModalVisible(true)
  }

  // 编辑文本区块
  const handleEditTextBlock = (textBlock) => {
    setEditingTextBlock(textBlock)
    textBlockForm.setFieldsValue(textBlock)
    setTextBlockModalVisible(true)
  }

  // 提交文本区块表单
  const handleTextBlockSubmit = async (values) => {
    try {
      if (editingTextBlock) {
        await textBlockAPI.updateTextBlock(editingTextBlock.id, values)
        message.success('文本区块更新成功')
      } else {
        await textBlockAPI.createTextBlock(values)
        message.success('文本区块创建成功')
      }
      
      setTextBlockModalVisible(false)
      loadTextBlocks()
    } catch (error) {
      message.error(editingTextBlock ? '更新文本区块失败' : '创建文本区块失败')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={4} className="page-title">
          {t('home.title')} - 首页DIY管理
        </Title>
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane 
            tab={
              <span>
                <PictureOutlined />
                轮播图管理
              </span>
            } 
            key="banners"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddBanner}
              >
                新增轮播图
              </Button>
            </div>
            
            <Table
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  width: 60
                },
                {
                  title: '图片',
                  dataIndex: 'imageUrl',
                  width: 120,
                  render: (url) => url ? (
                    <Image
                      width={80}
                      height={45}
                      src={url}
                      style={{ objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : '-'
                },
                {
                  title: '标题(中)',
                  dataIndex: 'title_zh',
                  width: 150,
                  ellipsis: true
                },
                {
                  title: '标题(英)',
                  dataIndex: 'title_en',
                  width: 150,
                  ellipsis: true
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 80,
                  render: (status) => (
                    <Tag color={status === 'enabled' ? 'green' : status === 'disabled' ? 'red' : 'orange'}>
                      {status === 'enabled' ? '启用' : status === 'disabled' ? '禁用' : '草稿'}
                    </Tag>
                  )
                },
                {
                  title: '权重',
                  dataIndex: 'weight',
                  width: 80,
                  sorter: (a, b) => a.weight - b.weight
                },
                {
                  title: '排序',
                  dataIndex: 'sort',
                  width: 80,
                  sorter: (a, b) => a.sort - b.sort
                },
                {
                  title: '操作',
                  width: 120,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditBanner(record)}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确定删除这个轮播图吗？"
                        onConfirm={() => handleDeleteBanner(record.id)}
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
              ]}
              dataSource={banners}
              rowKey="id"
              loading={bannersLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
              scroll={{ x: 1000 }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <span>
                <FileTextOutlined />
                文本区块管理
              </span>
            }
            key="textBlocks"
          >
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddTextBlock}
              >
                新增文本区块
              </Button>
            </div>

            <Table
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  width: 60
                },
                {
                  title: '标题(中)',
                  dataIndex: 'title_zh',
                  width: 150,
                  ellipsis: true
                },
                {
                  title: '标题(英)',
                  dataIndex: 'title_en',
                  width: 150,
                  ellipsis: true
                },
                {
                  title: '类型',
                  dataIndex: 'type',
                  width: 100,
                  render: (type) => (
                    <Tag color="blue">
                      {type === 'hero' ? '主标题' : type === 'feature' ? '特性' : type === 'about' ? '关于' : type}
                    </Tag>
                  )
                },
                {
                  title: '可见',
                  dataIndex: 'visible',
                  width: 80,
                  render: (visible) => (
                    <Tag color={visible ? 'green' : 'red'}>
                      {visible ? '是' : '否'}
                    </Tag>
                  )
                },
                {
                  title: '排序',
                  dataIndex: 'sort',
                  width: 80,
                  sorter: (a, b) => a.sort - b.sort
                },
                {
                  title: '操作',
                  width: 100,
                  render: (_, record) => (
                    <Space size="small">
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditTextBlock(record)}
                      >
                        编辑
                      </Button>
                    </Space>
                  )
                }
              ]}
              dataSource={textBlocks}
              rowKey="id"
              loading={textBlocksLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Tabs.TabPane>

          <Tabs.TabPane
            tab={
              <span>
                <TableOutlined />
                套餐价格表
              </span>
            }
            key="plans"
          >
            <div style={{ marginBottom: 16, color: '#666' }}>
              <span>套餐数据只读展示，如需编辑请前往"套餐管理"页面</span>
            </div>

            <Table
              columns={[
                {
                  title: 'ID',
                  dataIndex: 'id',
                  width: 60
                },
                {
                  title: '套餐代码',
                  dataIndex: 'code',
                  width: 100
                },
                {
                  title: '名称(中)',
                  dataIndex: 'name_zh',
                  width: 120
                },
                {
                  title: '名称(英)',
                  dataIndex: 'name_en',
                  width: 120
                },
                {
                  title: '价格(USDT)',
                  dataIndex: 'priceUSDT',
                  width: 100,
                  render: (price) => `$${price}`
                },
                {
                  title: '积分',
                  dataIndex: 'creditGrant',
                  width: 80
                },
                {
                  title: '状态',
                  dataIndex: 'isActive',
                  width: 80,
                  render: (isActive) => (
                    <Tag color={isActive ? 'green' : 'red'}>
                      {isActive ? '启用' : '禁用'}
                    </Tag>
                  )
                },
                {
                  title: '排序',
                  dataIndex: 'sort',
                  width: 80
                }
              ]}
              dataSource={plans}
              rowKey="id"
              loading={plansLoading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
              }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 轮播图编辑模态框 */}
      <Modal
        title={editingBanner ? '编辑轮播图' : '新增轮播图'}
        open={bannerModalVisible}
        onCancel={() => setBannerModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form
          form={bannerForm}
          layout="vertical"
          onFinish={handleBannerSubmit}
          initialValues={{ language: 'zh-CN', status: 'enabled', sort: 0, weight: 0 }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="图片"
                name="imageUrl"
                rules={[
                  { required: true, message: '请输入图片URL或上传图片' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve()
                      const v = String(value).trim()
                      if (/^c:\\fakepath\\/i.test(v)) {
                        return Promise.reject(new Error('请选择上传图片或输入有效URL（不能是本地路径）'))
                      }
                      if (/^(https?:)?\/\//i.test(v) || v.startsWith('/uploads/')) {
                        return Promise.resolve()
                      }
                      return Promise.reject(new Error('请输入以 http(s):// 或 /uploads/ 开头的图片地址'))
                    }
                  }
                ]}
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    style={{ width: 'calc(100% - 120px)' }}
                    placeholder="https://example.com/image.jpg 或点击上传图片"
                    addonBefore="URL"
                  />
                  <Upload
                    name="image"
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    customRequest={async ({ file, onSuccess, onError }) => {
                      try {
                        await handleImageUpload(file)
                        onSuccess()
                      } catch (error) {
                        onError(error)
                      }
                    }}
                  >
                    <Button
                      style={{ width: 120 }}
                      icon={uploadLoading ? <LoadingOutlined /> : <UploadOutlined />}
                      loading={uploadLoading}
                    >
                      {uploadLoading ? '上传中' : '上传图片'}
                    </Button>
                  </Upload>
                </Space.Compact>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress
                    percent={uploadProgress}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="图片Alt文本"
                name="altText"
              >
                <Input placeholder="图片描述" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="图片预览"
              >
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.imageUrl !== currentValues.imageUrl}>
                  {({ getFieldValue }) => {
                    const imageUrl = getFieldValue('imageUrl')
                    return imageUrl ? (
                      <Image
                        width={120}
                        height={68}
                        src={imageUrl}
                        style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
                        placeholder={
                          <div style={{
                            width: 120,
                            height: 68,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f5f5f5',
                            borderRadius: 4
                          }}>
                            <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                          </div>
                        }
                      />
                    ) : (
                      <div style={{
                        width: 120,
                        height: 68,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        borderRadius: 4,
                        border: '1px solid #d9d9d9'
                      }}>
                        <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf' }} />
                      </div>
                    )
                  }}
                </Form.Item>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="标题(中文)"
                name="title_zh"
                rules={[{ required: true, message: '请输入中文标题' }]}
              >
                <Input placeholder="中文标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="标题(英文)"
                name="title_en"
                rules={[{ required: true, message: '请输入英文标题' }]}
              >
                <Input placeholder="English Title" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="描述(中文)"
                name="desc_zh"
              >
                <TextArea rows={3} placeholder="中文描述" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="描述(英文)"
                name="desc_en"
              >
                <TextArea rows={3} placeholder="English Description" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="按钮文本(中文)"
                name="ctaText_zh"
              >
                <Input placeholder="立即体验" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="按钮文本(英文)"
                name="ctaText_en"
              >
                <Input placeholder="Get Started" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="按钮链接"
                name="ctaLink"
              >
                <Input placeholder="https://example.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="语言"
                name="language"
                rules={[{ required: true, message: '请选择语言' }]}
              >
                <Select placeholder="选择语言">
                  <Select.Option value="zh-CN">中文</Select.Option>
                  <Select.Option value="en-US">英文</Select.Option>
                  <Select.Option value="all">全部</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="地区"
                name="region"
              >
                <Select placeholder="选择地区">
                  <Select.Option value="CN">中国</Select.Option>
                  <Select.Option value="US">美国</Select.Option>
                  <Select.Option value="all">全部</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="权重"
                name="weight"
                initialValue={0}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="排序"
                name="sort"
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                initialValue="draft"
              >
                <Select>
                  <Select.Option value="enabled">启用</Select.Option>
                  <Select.Option value="disabled">禁用</Select.Option>
                  <Select.Option value="draft">草稿</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
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
            <Col span={8}>
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
                {editingBanner ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setBannerModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 文本区块编辑模态框 */}
      <Modal
        title={editingTextBlock ? '编辑文本区块' : '新增文本区块'}
        open={textBlockModalVisible}
        onCancel={() => setTextBlockModalVisible(false)}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form
          form={textBlockForm}
          layout="vertical"
          onFinish={handleTextBlockSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="标题(中文)"
                name="title_zh"
                rules={[{ required: true, message: '请输入中文标题' }]}
              >
                <Input placeholder="中文标题" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="标题(英文)"
                name="title_en"
                rules={[{ required: true, message: '请输入英文标题' }]}
              >
                <Input placeholder="English Title" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="内容(中文)"
                name="content_zh"
              >
                <TextArea rows={4} placeholder="中文内容" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="内容(英文)"
                name="content_en"
              >
                <TextArea rows={4} placeholder="English Content" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="类型"
                name="type"
                initialValue="feature"
              >
                <Select>
                  <Select.Option value="hero">主标题</Select.Option>
                  <Select.Option value="feature">特性</Select.Option>
                  <Select.Option value="about">关于</Select.Option>
                  <Select.Option value="custom">自定义</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="排序"
                name="sort"
                initialValue={0}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="可见"
                name="visible"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingTextBlock ? '更新' : '创建'}
              </Button>
              <Button onClick={() => setTextBlockModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
