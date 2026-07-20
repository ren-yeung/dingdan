<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <div class="brand">翼嘉通讯 · 天耘科技 ERP</div>
      <div class="sub">SD-WAN 专线订单管理平台</div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="onSubmit" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="onSubmit">登录</el-button>
      </el-form>
      <el-divider>演示账号</el-divider>
      <div class="demo">
        <div><b>管理员</b> admin / admin123（审核、转单、管理）</div>
        <div><b>销售主管</b> manager / manager123（看全部、改测试）</div>
        <div><b>销售</b> sales / sales123（提交测试、看自己）</div>
      </div>
    </el-card>
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
      const { data } = await api.post('/auth/login', form.value)
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
.login-wrap {
  height: 100%; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1f2d3d 0%, #2d4a6b 100%);
}
.login-card { width: 380px; padding: 10px 24px 24px; }
.brand { text-align: center; font-size: 20px; font-weight: 700; color: #1f2d3d; margin-top: 8px; }
.sub { text-align: center; color: #909399; font-size: 13px; margin: 6px 0 18px; }
.demo { font-size: 12px; color: #606266; line-height: 1.9; }
.demo b { color: #303133; }
</style>
