import { reactive } from 'vue'

const state = reactive({
  token: localStorage.getItem('erp_token') || '',
  user: JSON.parse(localStorage.getItem('erp_user') || 'null')
})

export function setAuth(token, user) {
  state.token = token
  state.user = user
  localStorage.setItem('erp_token', token)
  localStorage.setItem('erp_user', JSON.stringify(user))
}

export function logout() {
  state.token = ''
  state.user = null
  localStorage.removeItem('erp_token')
  localStorage.removeItem('erp_user')
}

export function isAuthed() {
  return !!state.token
}

export default state
