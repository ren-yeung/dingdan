<template>
  <div class="login-wrap">
    <!-- 顶部品牌区域 -->
    <div class="login-brand">
      <div class="brand-icon">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill="url(#brandGrad)"/>
          <path d="M12 20L18 14L24 20L18 26L12 20Z" fill="#fff" opacity=".9"/>
          <path d="M19 13L25 7L31 13L25 19L19 13Z" fill="#fff" opacity=".5"/>
          <path d="M19 27L25 21L31 27L25 33L19 27Z" fill="#fff" opacity=".3"/>
          <defs>
            <linearGradient id="brandGrad" x1="0" y1="0" x2="40" y2="40">
              <stop stop-color="#409eff"/>
              <stop offset="1" stop-color="#67c23a"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 class="brand-title">翼嘉 · 天耘 ERP</h1>
      <p class="brand-sub">SD-WAN 专线订单管理平台</p>
    </div>

    <!-- 登录表单 -->
    <div class="login-form">
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="onSubmit" />
        </el-form-item>
        <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="onSubmit">登 录</el-button>
      </el-form>
    </div>

    <p class="login-footer">翼嘉通讯 &copy; {{ new Date().getFullYear() }}</p>
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
/* ===== 全局容器 ===== */
.login-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0f172a 0%, #1e293b 35%, #1e3a5f 70%, #0f2942 100%);
  padding: 32px 24px;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.login-wrap::before {
  content: '';
  position: absolute;
  top: -80px; right: -60px;
  width: 260px; height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(64,158,255,.15), transparent 70%);
  pointer-events: none;
}
.login-wrap::after {
  content: '';
  position: absolute;
  bottom: -100px; left: -80px;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(103,194,58,.10), transparent 70%);
  pointer-events: none;
}

/* ===== 品牌区域 ===== */
.login-brand {
  text-align: center;
  margin-bottom: 36px;
  position: relative;
  z-index: 1;
}
.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.brand-icon svg {
  width: 56px;
  height: 56px;
  filter: drop-shadow(0 8px 24px rgba(64,158,255,.35));
}
.brand-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
  margin: 0 0 6px;
}
.brand-sub {
  font-size: 13px;
  color: rgba(255,255,255,.50);
  margin: 0;
  letter-spacing: 1px;
}

/* ===== 表单区域 ===== */
.login-form {
  width: 100%;
  max-width: 380px;
  background: rgba(255,255,255,.95);
  border-radius: 18px;
  padding: 28px 24px 24px;
  box-shadow:
    0 20px 60px rgba(0,0,0,.30),
    0 0 0 1px rgba(255,255,255,.08) inset;
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 1;
}

/* 输入框样式优化 */
.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
  box-shadow: 0 0 0 1px #e4e7ed;
  transition: box-shadow .25s, border-color .25s;
}
.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary), 0 0 0 3px rgba(64,158,255,.12);
}
.login-form :deep(.el-form-item) { margin-bottom: 20px; }

/* 登录按钮 */
.login-btn {
  width: 100%;
  border-radius: 10px;
  height: 46px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 6px;
  padding-left: 12px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%) !important;
  border: none !important;
  box-shadow: 0 6px 20px rgba(64,158,255,.35);
  transition: transform .15s, box-shadow .2s;
}
.login-btn:active {
  transform: scale(.98);
  box-shadow: 0 3px 12px rgba(64,158,255,.25);
}

/* 底部版权 */
.login-footer {
  text-align: center;
  font-size: 11px;
  color: rgba(255,255,255,.25);
  margin-top: 24px;
  letter-spacing: 1px;
  position: relative;
  z-index: 1;
}

/* ===== 移动端适配（手机端更紧凑） ===== */
@media (max-width: 768px) {
  .login-wrap {
    padding: 48px 20px 32px;
    justify-content: flex-start;
  }
  .login-brand {
    margin-bottom: 28px;
  }
  .brand-icon svg {
    width: 48px;
    height: 48px;
  }
  .brand-title {
    font-size: 20px;
  }
  .login-form {
    padding: 24px 20px 20px;
    border-radius: 16px;
  }
  .login-btn {
    height: 44px;
    font-size: 15px;
  }
}
</style>
