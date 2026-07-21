<template>
  <div class="login-wrap">
    <!-- 顶部品牌区：圆形图标 + 标题 -->
    <div class="login-brand">
      <div class="brand-avatar">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="16" fill="url(#avGrad)"/>
          <!-- 电脑显示器图标 -->
          <rect x="12" y="14" width="24" height="16" rx="2" stroke="#fff" stroke-width="2" fill="none"/>
          <line x1="12" y1="24" x2="36" y2="24" stroke="#fff" stroke-width="1.5" opacity=".4"/>
          <line x1="20" y1="30" x2="28" y2="30" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="24" y1="30" x2="24" y2="34" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <defs>
            <linearGradient id="avGrad" x1="0" y1="0" x2="48" y2="48">
              <stop stop-color="#409eff"/>
              <stop offset="1" stop-color="#67c23a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 class="brand-title">翼嘉 · 天耘 ERP</h1>
      <p class="brand-sub">SD-WAN 专线订单管理平台</p>
    </div>

    <!-- 登录表单卡片 -->
    <div class="login-form">
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="onSubmit" />
        </el-form-item>

        <!-- 记住我 + 忘记密码 -->
        <div class="form-extra">
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
          <span class="forgot-link">忘记密码？</span>
        </div>

        <el-button type="primary" size="large" class="btn-login" :loading="loading" @click="onSubmit">登 录</el-button>
      </el-form>
    </div>

    <p class="login-footer">天耘科技 &copy; {{ new Date().getFullYear() }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import api from '../api'
import { setAuth } from '../store/auth'

const router = useRouter()
const form = ref({ username: '', password: '' })
const loading = ref(false)
const formRef = ref(null)
const rememberMe = ref(false)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function onSubmit() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const { data } = await api.post('/login', form.value)
      setAuth(data.token, data.user)
      router.push('/home')
    } catch (e) {
      const msg = e.response && e.response.data && e.response.data.detail ? e.response.data.detail : '登录失败'
      alert(msg)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
/* ===== 全局容器 —— 固定满屏，不可滚动 ===== */
.login-wrap {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #e9eef5 0%, #e2e8f1 50%, #dde6f0 100%);
  padding: 32px 28px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 背景柔光装饰 */
.login-wrap::before {
  content: '';
  position: absolute;
  top: -60px; right: -50px;
  width: 240px; height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(64,158,255,.10), transparent 70%);
  pointer-events: none;
}
.login-wrap::after {
  content: '';
  position: absolute;
  bottom: -80px; left: -60px;
  width: 280px; height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(103,194,58,.07), transparent 70%);
  pointer-events: none;
}

/* ===== 品牌区 —— 圆形图标 + 标题 ===== */
.login-brand {
  text-align: center;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.brand-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.brand-avatar svg {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 8px 20px rgba(64,158,255,.25));
}
.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
  letter-spacing: 1px;
  margin: 0 0 4px;
}
.brand-sub {
  font-size: 12px;
  color: #909399;
  margin: 0;
  letter-spacing: 0.5px;
}

/* ===== 表单区域 ===== */
.login-form {
  width: 100%;
  max-width: 380px;
  background: #fff;
  border-radius: 16px;
  padding: 26px 24px 22px;
  box-shadow: 0 12px 40px rgba(31, 45, 61, .10);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

/* 输入框 */
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
  box-shadow: 0 0 0 1px #dcdfe6;
  transition: box-shadow .25s;
}
.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary), 0 0 0 3px rgba(64,158,255,.10);
}
.login-form :deep(.el-form-item) { margin-bottom: 18px; }

/* 记住我 + 忘记密码 */
.form-extra {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 13px;
}
.form-extra :deep(.el-checkbox__label) {
  color: #606266;
  font-size: 13px;
}
.forgot-link {
  color: #409eff;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}
.forgot-link:active { opacity: .7; }

/* 登录按钮 */
.btn-login {
  width: 100%;
  border-radius: 10px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  padding-left: 10px;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(64,158,255,.30);
  transition: transform .15s, box-shadow .2s;
}
.btn-login:active {
  transform: scale(.98);
  box-shadow: 0 2px 8px rgba(64,158,255,.20);
}

/* 底部版权 */
.login-footer {
  text-align: center;
  font-size: 11px;
  color: #a8abb2;
  margin-top: 22px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

/* ===== 移动端适配（固定一屏，不滚动） ===== */
@media (max-width: 768px) {
  .login-wrap {
    height: 100vh;
    height: 100dvh;
    padding: 24px 22px calc(16px + env(safe-area-inset-bottom));
    justify-content: center;
    gap: 0;
  }
  .login-brand { margin-bottom: 22px; }
  .brand-avatar svg { width: 56px; height: 56px; }
  .brand-avatar { margin-bottom: 10px; }
  .brand-title { font-size: 18px; }
  .brand-sub { font-size: 11px; }
  .login-form {
    padding: 20px 18px 18px;
    border-radius: 14px;
  }
  .login-form :deep(.el-form-item) { margin-bottom: 14px; }
  .form-extra { margin-bottom: 16px; }
  .btn-login { height: 40px; font-size: 13px; letter-spacing: 4px; }
  .login-footer {
    margin-top: 22px;
    padding-top: 0;
    font-size: 10px;
  }
}

/* 禁用整个页面的滚动 */
html:has(.login-wrap), html:has(.login-wrap) body {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
}
</style>
