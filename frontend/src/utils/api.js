import axios from 'axios'
import { message } from 'antd'
import i18n from '../i18n'
import { getToken, removeToken } from './auth'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token && config.url.includes('/admin/')) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const { status, data } = error.response || {}
    
    if (status === 401) {
      // 未授权，清除token并跳转登录
      removeToken()
      window.location.href = '/login'
      message.error(i18n.t('errors.unauthorized'))
    } else if (status >= 500) {
      message.error(i18n.t('errors.server'))
    } else if (data?.message) {
      message.error(data.message)
    } else {
      message.error(i18n.t('errors.requestFailed'))
    }
    
    return Promise.reject(error)
  }
)

// API 函数

// ========== 认证相关 ==========
export const authAPI = {
  // 自动注册（用于测试）
  autoRegister: () => api.post('/public/auth/auto')
}

// ========== 用户管理 ==========
export const userAPI = {
  // 获取用户列表
  getUsers: (params) => api.get('/admin/users', { params }),
  // 创建用户
  createUser: (data) => api.post('/admin/users', data),
  // 获取用户详情
  getUser: (id) => api.get(`/admin/users/${id}`),
  // 更新用户
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  // 调整积分
  adjustCredit: (id, data) => api.post(`/admin/users/${id}/credit/adjust`, data)
}

// ========== 套餐管理 ==========
export const planAPI = {
  // 获取所有套餐
  getPlans: () => api.get('/admin/plans'),
  // 创建套餐
  createPlan: (data) => api.post('/admin/plans', data),
  // 更新套餐
  updatePlan: (id, data) => api.patch(`/admin/plans/${id}`, data),
  // 批量排序
  sortPlans: (plans) => api.patch('/admin/plans/sort', { plans })
}

// ========== 订单管理 ==========
export const orderAPI = {
  // 获取订单列表
  getOrders: (params) => api.get('/admin/orders', { params }),
  // 获取订单详情
  getOrder: (id) => api.get(`/admin/orders/${id}`),
  // 标记已付款
  markPaid: (id, data) => api.post(`/admin/orders/${id}/mark-paid`, data),
  // 设为过期
  setExpired: (id) => api.post(`/admin/orders/${id}/expire`)
}

// ========== 评价管理 ==========
export const reviewAPI = {
  // 获取评价列表
  getReviews: (params) => api.get('/admin/reviews', { params }),
  // 创建评价
  createReview: (data) => api.post('/admin/reviews', data),
  // 更新评价
  updateReview: (id, data) => api.patch(`/admin/reviews/${id}`, data),
  // 删除评价
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`)
}

// ========== 工具 ==========
export const toolsAPI = {
  translate: (text, source = 'zh', target = 'es') =>
    api.post('/admin/translate', { text, source, target })
}

// ========== 横幅管理 ==========
export const bannerAPI = {
  // 获取横幅列表
  getBanners: () => api.get('/admin/banners'),
  // 创建横幅
  createBanner: (data) => api.post('/admin/banners', data),
  // 更新横幅
  updateBanner: (id, data) => api.patch(`/admin/banners/${id}`, data),
  // 删除横幅
  deleteBanner: (id) => api.delete(`/admin/banners/${id}`)
}

// ========== 文本区块管理 ==========
export const textBlockAPI = {
  // 获取文本区块列表
  getTextBlocks: () => api.get('/admin/text-blocks'),
  // 创建文本区块
  createTextBlock: (data) => api.post('/admin/text-blocks', data),
  // 更新文本区块
  updateTextBlock: (id, data) => api.patch(`/admin/text-blocks/${id}`, data)
}

// ========== 设置管理 ==========
export const settingsAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.patch('/admin/settings', data)
}

// ========== 文件上传管理 ==========
export const uploadAPI = {
  // 上传图片
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    // 注意：不要手动设置 Content-Type，浏览器会自动加上 multipart/form-data 边界
    return api.post('/admin/upload/image', formData)
  },
  // 删除文件
  deleteFile: (filename) => api.delete('/admin/upload/delete', { data: { filename } })
}

// ========== 公开API ==========
export const publicAPI = {
  // 获取公开套餐列表
  getPlans: () => api.get('/public/plans'),
  // 获取横幅列表
  getBanners: (params) => api.get('/public/banners', { params }),
  // 获取文本区块
  getTextBlocks: () => api.get('/public/text-blocks'),
  // 获取评价
  getReviews: (params) => api.get('/public/reviews', { params })
}

export default api
