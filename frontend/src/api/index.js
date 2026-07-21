import axios from 'axios'
import store from '../store/auth'

// 部署时通过构建环境变量 VITE_API_BASE 指定后端地址（如 https://api.dingdan.ccwu.cc）
// 本地开发不设置，则使用同源（前端与后端同域）
export const API_BASE = import.meta.env.VITE_API_BASE || ''

const api = axios.create({ baseURL: API_BASE + '/api' })

api.interceptors.request.use((cfg) => {
  if (store.token) cfg.headers.Authorization = 'Bearer ' + store.token
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      // 登录过期，回到登录页，同时清掉两种存储
      localStorage.removeItem('erp_token')
      localStorage.removeItem('erp_user')
      sessionStorage.removeItem('erp_token')
      sessionStorage.removeItem('erp_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

// 图片等静态资源地址：若已为完整 URL 直接返回，否则拼上 API_BASE
export function imgUrl(p) {
  if (!p) return ''
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return API_BASE + p
}

export default api
