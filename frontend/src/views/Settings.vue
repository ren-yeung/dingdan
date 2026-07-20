<template>
  <div>
    <div class="page-head" style="margin-bottom: 16px;">
      <span class="page-icon"><el-icon><Setting /></el-icon></span>
      <div>
        <div class="page-title">系统设置</div>
        <div class="page-sub">用户与角色、产品管理、个人密码修改（管理员可见）</div>
      </div>
    </div>
    <el-tabs v-model="tab">
      <el-tab-pane label="用户管理" name="users">
        <div class="toolbar page-toolbar">
          <el-button type="primary" :icon="Plus" @click="openUser()">新增用户</el-button>
        </div>
        <el-table :data="users" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="username" label="用户名" width="140" />
          <el-table-column prop="name" label="姓名" width="140" />
          <el-table-column label="角色" width="110">
            <template #default="{ row }">
              <el-tag :type="roleType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch v-model="row.active" @change="(v) => toggleUser(row, v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button link type="warning" @click="openUser(row)">编辑</el-button>
              <el-button link type="danger" @click="delUser(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="产品管理" name="products">
        <div class="toolbar page-toolbar">
          <el-button type="primary" :icon="Plus" @click="openProduct()">新增产品</el-button>
        </div>
        <el-table :data="products" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="产品名称" width="180" />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-switch v-model="row.active" @change="(v) => toggleProduct(row, v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button link type="warning" @click="openProduct(row)">编辑</el-button>
              <el-button link type="danger" @click="delProduct(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="修改密码" name="pwd">
        <el-form :model="pwd" label-width="120px" style="max-width: 420px; margin-top: 10px">
          <el-form-item label="原密码"><el-input v-model="pwd.old_password" type="password" show-password /></el-form-item>
          <el-form-item label="新密码"><el-input v-model="pwd.new_password" type="password" show-password /></el-form-item>
          <el-button type="primary" :loading="pwdSaving" @click="changePwd">保存密码</el-button>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 用户对话框 -->
    <el-dialog :title="userForm.id ? '编辑用户' : '新增用户'" v-model="userVisible" width="480px">
      <el-form :model="userForm" label-width="90px">
        <el-form-item label="用户名"><el-input v-model="userForm.username" :disabled="!!userForm.id" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="userForm.name" /></el-form-item>
        <el-form-item :label="userForm.id ? '重置密码' : '密码'">
          <el-input v-model="userForm.password" type="password" show-password :placeholder="userForm.id ? '留空则不修改' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="销售主管" value="manager" />
            <el-option label="销售" value="sales" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用"><el-switch v-model="userForm.active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 产品对话框 -->
    <el-dialog :title="productForm.id ? '编辑产品' : '新增产品'" v-model="productVisible" width="480px">
      <el-form :model="productForm" label-width="90px">
        <el-form-item label="产品名称"><el-input v-model="productForm.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="productForm.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="productForm.active" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="productVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const tab = ref('users')
const users = ref([])
const products = ref([])
const saving = ref(false)
const pwdSaving = ref(false)

const userVisible = ref(false)
const userForm = ref({ id: null, username: '', name: '', password: '', role: 'sales', active: true })
const productVisible = ref(false)
const productForm = ref({ id: null, name: '', description: '', active: true })
const pwd = ref({ old_password: '', new_password: '' })

function roleLabel(r) { return { admin: '管理员', manager: '销售主管', sales: '销售' }[r] || r }
function roleType(r) { return { admin: 'danger', manager: 'warning', sales: 'success' }[r] || 'info' }

async function loadUsers() {
  const { data } = await api.get('/users')
  users.value = data
}
async function loadProducts() {
  const { data } = await api.get('/products')
  products.value = data
}
onMounted(() => { loadUsers(); loadProducts() })

function openUser(row) {
  userForm.value = row ? { ...row, password: '' } : { id: null, username: '', name: '', password: '', role: 'sales', active: true }
  userVisible.value = true
}
async function submitUser() {
  if (!userForm.value.id && !userForm.value.password) { ElMessage.warning('请输入密码'); return }
  saving.value = true
  try {
    if (userForm.value.id) {
      await api.put('/users/' + userForm.value.id, userForm.value)
    } else {
      await api.post('/users', userForm.value)
    }
    ElMessage.success('已保存')
    userVisible.value = false
    loadUsers()
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '保存失败')
  } finally {
    saving.value = false
  }
}
async function toggleUser(row, v) {
  try {
    await api.put('/users/' + row.id, { active: v })
  } catch (e) { loadUsers() }
}
async function delUser(row) {
  await ElMessageBox.confirm('确认删除用户 ' + row.name + '？', '提示', { type: 'warning' })
  await api.delete('/users/' + row.id)
  ElMessage.success('已删除')
  loadUsers()
}

function openProduct(row) {
  productForm.value = row ? { ...row } : { id: null, name: '', description: '', active: true }
  productVisible.value = true
}
async function submitProduct() {
  saving.value = true
  try {
    if (productForm.value.id) {
      await api.put('/products/' + productForm.value.id, productForm.value)
    } else {
      await api.post('/products', productForm.value)
    }
    ElMessage.success('已保存')
    productVisible.value = false
    loadProducts()
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '保存失败')
  } finally {
    saving.value = false
  }
}
async function toggleProduct(row, v) {
  try { await api.put('/products/' + row.id, { active: v }) } catch (e) { loadProducts() }
}
async function delProduct(row) {
  await ElMessageBox.confirm('确认删除产品 ' + row.name + '？', '提示', { type: 'warning' })
  await api.delete('/products/' + row.id)
  ElMessage.success('已删除')
  loadProducts()
}

async function changePwd() {
  if (!pwd.value.old_password || !pwd.value.new_password) { ElMessage.warning('请填写密码'); return }
  pwdSaving.value = true
  try {
    await api.post('/me/password', pwd.value)
    ElMessage.success('密码已修改')
    pwd.value = { old_password: '', new_password: '' }
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '修改失败')
  } finally {
    pwdSaving.value = false
  }
}
</script>

<style scoped>
.toolbar { margin-bottom: 12px; }
</style>
