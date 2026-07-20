// 设备检测：响应式单例 isMobile
// 仅当视口宽度 <= 768px 时为真，桌面端恒为 false，保证 PC 页面零影响。
import { ref } from 'vue'

const MOBILE_QUERY = '(max-width: 768px)'
const isMobile = ref(false)
let bound = false

function apply(e) {
  isMobile.value = e.matches
}

function ensureBound() {
  if (bound) return
  if (typeof window === 'undefined' || !window.matchMedia) return
  const mql = window.matchMedia(MOBILE_QUERY)
  apply(mql)
  if (mql.addEventListener) {
    mql.addEventListener('change', apply)
  } else if (mql.addListener) {
    // 旧浏览器兼容
    mql.addListener(apply)
  }
  bound = true
}

export function useDevice() {
  ensureBound()
  return { isMobile }
}
