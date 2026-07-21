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

        <!-- 手机登录（暂未实现） -->
        <button class="btn-phone" @click.prevent>手机登录</button>

        <!-- 注册（暂未实现） -->
        <button class="btn-reg" @click.prevent>注 册</button>
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
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 35%, #1e3a5f 70%, #0f2942 100%);
  padding: 32px 28px;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 背景装饰光晕 */
.login-wrap::before {
  content: '';
  position: absolute;
  top: -80px; right: -60px;
  width: 260px; height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(64,158,255,.14), transparent 70%);
  pointer-events: none;
}
.login-wrap::after {
  content: '';
  position: absolute;
  bottom: -100px; left: -80px;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(103,194,58,.09), transparent 70%);
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
  filter: drop-shadow(0 8px 24px rgba(64,158,255,.35));
}
.brand-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  margin: 0 0 4px;
}
.brand-sub {
  font-size: 12px;
  color: rgba(255,255,255,.42);
  margin: 0;
  letter-spacing: 0.5px;
}

/* ===== 表单区域 ===== */
.login-form {
  width: 100%;
  max-width: 380px;
  background: rgba(255,255,255,.95);
  border-radius: 16px;
  padding: 26px 24px 22px;
  box-shadow:
    0 20px 60px rgba(0,0,0,.30),
    0 0 0 1px rgba(255,255,255,.08) inset;
  backdrop-filter: blur(12px);
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

/* 手机登录按钮（绿色描边） */
.btn-phone {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #67c23a;
  background: #fff;
  border: 1.5px solid #67c23a;
  margin-top: 12px;
  cursor: pointer;
  transition: background .2s, color .2s;
  letter-spacing: 2px;
}
.btn-phone:active {
  background: #f0f9eb;
}

/* 注册按钮（灰色描边） */
.btn-reg {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #909399;
  background: #fff;
  border: 1.5px solid #dcdfe6;
  margin-top: 12px;
  cursor: pointer;
  transition: background .2s, color .2s;
  letter-spacing: 2px;
}
.btn-reg:active {
  background: #f5f7fa;
}

/* 底部版权 */
.login-footer {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,.22);
  margin-top: auto;
  padding-top: 18px;
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
    padding: 36px 22px calc(14px + env(safe-area-inset-bottom));
    justify-content: center;
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
  .btn-login,
  .btn-phone,
  .btn-reg { height: 40px; font-size: 13px; }
  .btn-login { letter-spacing: 4px; }
  .btn-phone,
  .btn-reg { margin-top: 10px; letter-spacing: 2px; }
  .login-footer { margin-top: auto; padding-top: 12px; font-size: 10px; }
}

/* 禁用整个页面的滚动 */
html:has(.login-wrap), html:has(.login-wrap) body {
  overflow: hidden !important;
  position: fixed;
  width: 100%;
  height: 100%;
}
</style>
