import { reactive } from 'vue'

function readToken() {
  return sessionStorage.getItem('erp_token') || localStorage.getItem('erp_token') || ''
}
function readUser() {
  const raw = sessionStorage.getItem('erp_user') || localStorage.getItem('erp_user') || 'null'
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const state = reactive({
  token: readToken(),
  user: readUser()
})

function clearAll() {
  localStorage.removeItem('erp_token')
  localStorage.removeItem('erp_user')
  sessionStorage.removeItem('erp_token')
  sessionStorage.removeItem('erp_user')
}

// persist=true  → 登录态写入 localStorage，关闭浏览器后仍保留（"记住我"）
// persist=false → 登录态写入 sessionStorage，关闭浏览器/标签页即清除
export function setAuth(token, user, persist = true) {
  state.token = token
  state.user = user
  clearAll()
  const store = persist ? localStorage : sessionStorage
  store.setItem('erp_token', token)
  store.setItem('erp_user', JSON.stringify(user))
}

export function logout() {
  state.token = ''
  state.user = null
  clearAll()
}

export function isAuthed() {
  return !!state.token
}

export default state
