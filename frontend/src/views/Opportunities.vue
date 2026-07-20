<template>
  <div>
    <div class="toolbar page-toolbar">
      <div class="page-head">
        <span class="page-icon"><el-icon><Opportunity /></el-icon></span>
        <div>
          <div class="page-title">商机管理</div>
          <div class="page-sub">经销商提交的测试需求 · 审核通过后转正式订单</div>
        </div>
      </div>
      <div class="page-actions">
        <el-radio-group v-model="statusFilter" @change="load">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="pending">待审核</el-radio-button>
          <el-radio-button label="approved">已通过</el-radio-button>
          <el-radio-button label="rejected">已驳回</el-radio-button>
          <el-radio-button label="converted">已转订单</el-radio-button>
        </el-radio-group>
        <el-button type="primary" :icon="Plus" @click="openCreate">提交测试需求</el-button>
      </div>
    </div>

    <el-table :data="list" border stripe>
      <el-table-column prop="company_name" label="公司名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="商机时间" width="155">
        <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column prop="handler" label="经办人" width="90" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="bandwidth" label="需求带宽" width="100" />
      <el-table-column prop="country" label="需求国家" width="90" />
      <el-table-column prop="submitter_name" label="提交人" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
          <el-button link type="warning" v-if="canEdit(row)" @click="openEdit(row)">修改</el-button>
          <el-button link type="success" v-if="canReview(row)" @click="openReview(row)">审核</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 提交/编辑 对话框 -->
    <el-dialog :title="dialogTitle" v-model="formVisible" width="680px">
      <el-form :model="form" label-width="100px" class="opp-form">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="公司名称" required>
              <el-input v-model="form.company_name" placeholder="测试公司名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="经办人" required>
              <el-input v-model="form.handler" placeholder="客户方联系人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话" required>
              <el-input v-model="form.phone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="本地运营商网络">
              <el-input v-model="form.local_operator" placeholder="如：中国电信" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="需求带宽">
              <el-input v-model="form.bandwidth" placeholder="如 100M" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="需求国家">
              <el-input v-model="form.country" placeholder="如：美国" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="安装地址">
              <el-input v-model="form.install_address" placeholder="设备安装地址" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="提交人">
              <el-select v-model="form.submitter_id" style="width: 100%">
                <el-option
                  v-for="u in submitterOptions"
                  :key="u.id"
                  :label="u.name"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="访问网站">
          <el-input v-model="form.website" placeholder="https://" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog title="审核测试需求" v-model="reviewVisible" width="520px">
      <el-alert v-if="current" :closable="false" style="margin-bottom: 14px">
        <template #title>
          公司：{{ current.company_name }} · 经办人：{{ current.handler }} · {{ current.phone }}
        </template>
      </el-alert>
      <el-form label-width="80px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="reviewForm.status">
            <el-radio value="approved">通过</el-radio>
            <el-radio value="rejected">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="回复">
          <el-input v-model="reviewForm.admin_reply" type="textarea" :rows="3" placeholder="审核意见 / 回复内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitReview">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog title="测试需求详情" v-model="detailVisible" width="720px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="公司名称">{{ current.company_name }}</el-descriptions-item>
          <el-descriptions-item label="经办人">{{ current.handler }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ current.phone }}</el-descriptions-item>
          <el-descriptions-item label="本地运营商">{{ current.local_operator }}</el-descriptions-item>
          <el-descriptions-item label="需求带宽">{{ current.bandwidth }}</el-descriptions-item>
          <el-descriptions-item label="需求国家">{{ current.country }}</el-descriptions-item>
          <el-descriptions-item label="安装地址" :span="2">{{ current.install_address }}</el-descriptions-item>
          <el-descriptions-item label="访问网站" :span="2">{{ current.website }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusType(current.status)" size="small">{{ statusLabel(current.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交人">{{ current.submitter_name }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="current.admin_reply" type="info" :closable="false" style="margin-top: 14px">
          <template #title>审核回复：{{ current.admin_reply }}</template>
        </el-alert>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import api from '../api'
import store from '../store/auth'
import { ElMessage } from 'element-plus'

const user = computed(() => store.user)
const list = ref([])
const statusFilter = ref('')

const emptyForm = () => ({
  company_name: '', handler: '', phone: '', install_address: '',
  local_operator: '', bandwidth: '', country: '', website: '',
  submitter_id: null
})
const form = ref(emptyForm())
const formVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const saving = ref(false)

const reviewVisible = ref(false)
const reviewForm = ref({ status: 'approved', admin_reply: '' })
const detailVisible = ref(false)
const current = ref(null)

// 提交人选项：除管理员外的所有用户
const submitterOptions = ref([])

function statusLabel(s) {
  return { pending: '待审核', approved: '已通过', rejected: '已驳回', converted: '已转订单' }[s] || s
}
function fmtTime(t) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function statusType(s) {
  return { pending: 'warning', approved: 'success', rejected: 'danger', converted: 'info' }[s] || 'info'
}

function canEdit(row) {
  if (user.value.role === 'admin') return true
  if (user.value.role === 'manager') return row.status !== 'converted'
  if (user.value.role === 'sales') return row.submitter_id === user.value.id && ['pending', 'rejected'].includes(row.status)
  return false
}
function canReview(row) {
  return user.value.role === 'admin' && row.status === 'pending'
}

async function load() {
  const { data } = await api.get('/opportunities', { params: { status: statusFilter.value || undefined } })
  list.value = data
}

async function loadUsers() {
  try {
    const { data } = await api.get('/users')
    // 除管理员外的所有用户（含销售主管和销售）
    submitterOptions.value = data.filter(u => u.role !== 'admin')
  } catch (e) {
    /* 非管理员无权获取用户列表时静默忽略 */
  }
}
onMounted(load)

function openCreate() {
  form.value = emptyForm()
  // 默认提交人为当前登录用户
  form.value.submitter_id = user.value.id
  editingId.value = null
  dialogTitle.value = '提交测试需求'
  formVisible.value = true
  loadUsers()
}
function openEdit(row) {
  current.value = row
  form.value = { ...emptyForm(), ...row }
  if (!form.value.submitter_id) form.value.submitter_id = user.value.id
  editingId.value = row.id
  dialogTitle.value = '修改测试需求'
  formVisible.value = true
  loadUsers()
}
function openDetail(row) {
  current.value = row
  detailVisible.value = true
}
function openReview(row) {
  current.value = row
  reviewForm.value = { status: 'approved', admin_reply: '' }
  reviewVisible.value = true
}

async function submitForm() {
  if (!form.value.company_name || !form.value.handler || !form.value.phone) {
    ElMessage.warning('请填写公司名称、经办人、电话')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await api.put('/opportunities/' + editingId.value, form.value)
      ElMessage.success('已保存')
    } else {
      await api.post('/opportunities', form.value)
      ElMessage.success('已提交，等待审核')
    }
    formVisible.value = false
    load()
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.detail
    ElMessage.error(msg || '操作失败')
  } finally {
    saving.value = false
  }
}

async function submitReview() {
  saving.value = true
  try {
    await api.post('/opportunities/' + current.value.id + '/review', reviewForm.value)
    ElMessage.success('审核完成')
    reviewVisible.value = false
    load()
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.detail
    ElMessage.error(msg || '审核失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.opp-form .el-form-item { margin-bottom: 18px; }
</style>
