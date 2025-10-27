// 认证工具函数

const TOKEN_KEY = 'admin_token'

/**
 * 获取存储的管理员token
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 设置管理员token
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 移除管理员token
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 检查是否已登录
 */
export function isAuthenticated() {
  const token = getToken()
  return !!token
}