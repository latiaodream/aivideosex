import axios from 'axios'
import i18n from '../i18n'

// Base URL for API
// 统一使用 '/api' 前缀，由前端代理或网关转发到后端
const BASE_URL = '/api'

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Dev helper: attach X-Client-IP for local testing
apiClient.interceptors.request.use((config) => {
  if (import.meta.env.MODE !== 'production') {
    const debugIp = localStorage.getItem('debug_ip');
    if (debugIp && !config.headers['X-Client-IP']) {
      config.headers['X-Client-IP'] = debugIp;
    }
  }
  return config;
});

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message, 'url:', error.config?.url)
      return Promise.reject(new Error(i18n.t('errors.network') || 'Network error'))
    }

    // Handle API errors
    const errorMessage = error.response?.data?.message || error.message || (i18n.t('errors.requestFailed') || 'Request failed')
    console.error('API Error:', errorMessage)
    return Promise.reject(new Error(errorMessage))
  }
)

// 用户自动注册API
export const authAPI = {
  // 基于IP自动注册
  autoRegister: () => apiClient.post('/public/auth/auto')
}

// 套餐API
export const planAPI = {
  // 获取前台套餐列表
  getPublicPlans: () => apiClient.get('/public/plans'),
  // 获取后台套餐配置（含提示语等），默认走本地5179端口，可通过 VITE_ADMIN_BASE_URL 覆盖
  getAdminPlans: async () => {
    try {
      // 在开发环境走 Vite 代理以避免 CORS；生产则使用直连或配置的后台地址
      const isDev = import.meta.env.DEV
      if (isDev) {
        const res = await axios.get('/admin-plans', { timeout: 30000 })
        const payload = res?.data
        if (typeof payload === 'string') return []
        if (Array.isArray(payload)) return payload
        if (Array.isArray(payload?.data)) return payload.data
        if (Array.isArray(payload?.plans)) return payload.plans
        return []
      }

      const ADMIN_BASE = import.meta.env.VITE_ADMIN_BASE_URL || 'http://localhost:5177'
      const ADMIN_PLANS_PATH = import.meta.env.VITE_ADMIN_PLANS_PATH || '/admin/plans'
      const url = `${ADMIN_BASE}${ADMIN_PLANS_PATH}`
      const res = await axios.get(url, { timeout: 30000 })
      const payload = res?.data
      // 如果返回的是字符串（可能是HTML），直接忽略并返回空数组
      if (typeof payload === 'string') return []
      // 常见结构：数组 | {data:[...]} | {plans:[...]}
      if (Array.isArray(payload)) return payload
      if (Array.isArray(payload?.data)) return payload.data
      if (Array.isArray(payload?.plans)) return payload.plans
      return []
    } catch (e) {
      console.warn('[planAPI.getAdminPlans] 获取后台套餐失败:', e.message)
      return []
    }
  }
}

// 订单API
export const orderAPI = {
  // 创建订单
  createOrder: (userId, planId, chain = 'TRC20') => apiClient.post('/public/orders', { userId, planId, chain }),

  // 获取订单状态
  getOrderStatus: (orderNo) => apiClient.get(`/public/orders/${orderNo}/status`)
}

// 轮播图API
export const bannerAPI = {
  // 获取前台轮播图列表
  getPublicBanners: (language = 'zh-CN', region) => {
    const params = new URLSearchParams({ language })
    if (region) params.append('region', region)
    return apiClient.get(`/public/banners?${params.toString()}`)
  }
}

// 评价API
export const reviewAPI = {
  // 获取前台评价列表
  // 如果不提供 language，则不在服务端做语言过滤，交由前端做本地化优先显示
  getPublicReviews: (language, limit = 20) => {
    const params = new URLSearchParams()
    if (language) params.set('language', language)
    params.set('limit', String(limit))
    const query = params.toString()
    return apiClient.get(`/public/reviews${query ? `?${query}` : ''}`)
  }
}
// 支付加速API
export const paymentsAPI = {
  forceCheck: (orderNo) => apiClient.post('/public/payments/force-check', { orderNo })
}


// 文本区块API
export const textBlockAPI = {
  // 获取文本区块
  getPublicTextBlocks: () => apiClient.get('/public/text-blocks')
}

// Search API
export const searchAPI = {
  // Image search
  imageSearch: (imageData, options = {}) => apiClient.post('/search/image', { imageData, ...options })
}

export default apiClient
