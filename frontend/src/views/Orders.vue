<template>
  <div>
    <div class="toolbar page-toolbar">
      <div class="page-head">
        <span class="page-icon"><el-icon><List /></el-icon></span>
        <div>
          <div class="page-title">销售订单</div>
          <div class="page-sub">正式订单管理 · 由测试商机转来或手动新建</div>
        </div>
      </div>
      <div class="page-actions">
        <el-radio-group v-model="statusFilter" @change="load">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="active">合作中</el-radio-button>
          <el-radio-button label="ended">已结束</el-radio-button>
        </el-radio-group>
        <div v-if="isAdmin">
          <el-button type="success" :icon="Switch" @click="openConvert">测试转正式</el-button>
          <el-button type="primary" :icon="Plus" @click="openNew">新建订单</el-button>
        </div>
      </div>
    </div>

    <el-table :data="list" class="compact-table">
      <el-table-column label="订单信息" min-width="280">
        <template #default="{ row }">
          <div class="order-info">
            <span class="order-no">{{ row.order_no }}</span>
            <span class="order-user">{{ row.actual_user }}</span>
          </div>
          <div class="order-sub">{{ row.handler }} · {{ row.contact_phone }}</div>
          <div class="col-light">甲方：{{ row.party_a || '—' }} / 乙方：{{ row.party_b || '—' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="产品" width="130">
        <template #default="{ row }">
          <div>{{ row.bandwidth }}</div>
          <div class="col-light">¥{{ fmt(row.monthly_rent) }}/月 · {{ row.cooperation_period }}</div>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">
          <div>合作：{{ row.cooperation_date || '-' }}</div>
          <div class="col-light">付款：{{ row.next_payment_date || '-' }}</div>
        </template>
      </el-table-column>
      <el-table-column label="合作国家" width="90" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.country" size="small" effect="plain" type="info">{{ row.country }}</el-tag>
          <span v-else class="col-light">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="owner_name" label="归属" width="70" />
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '合作中' : '已结束' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
          <el-button link type="warning" v-if="isAdmin" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 测试转正式 -->
    <el-dialog title="测试转正式订单" v-model="convVisible" width="760px">
      <div style="margin-bottom: 16px;">
      <el-form label-width="100px">
        <el-form-item label="选择商机" required>
          <el-select v-model="selectedOppId" filterable placeholder="选择已通过的商机" style="width: 100%" @change="onPickOpp">
            <el-option v-for="o in approvedOpps" :key="o.id" :label="o.company_name + '（' + o.submitter_name + '）'" :value="o.id" />
          </el-select>
        </el-form-item>
      </el-form>
      </div>
      <el-form :model="convForm" label-width="100px">

        <!-- 签约信息 -->
        <div class="form-section-title"><span class="section-dot"></span>签约信息</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="甲方"><el-input v-model="convForm.party_a" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="乙方"><el-input v-model="convForm.party_b" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="技术提供方"><el-input v-model="convForm.tech_provider" /></el-form-item></el-col>
        </el-row>

        <!-- 产品与价格 -->
        <div class="form-section-title"><span class="section-dot"></span>产品与价格</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="带宽"><el-input v-model="convForm.bandwidth" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="月租(元)"><el-input v-model.number="convForm.monthly_rent" type="number" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作周期"><el-input v-model="convForm.cooperation_period" placeholder="如 12个月" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作国家"><el-input v-model="convForm.country" placeholder="如 美国" /></el-form-item></el-col>
        </el-row>

        <!-- 客户信息 -->
        <div class="form-section-title"><span class="section-dot"></span>客户信息<span class="section-hint">（来自测试需求，可修改）</span></div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="实际使用方"><el-input v-model="convForm.actual_user" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经办人"><el-input v-model="convForm.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="convForm.contact_phone" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="安装地址"><el-input v-model="convForm.install_address" /></el-form-item></el-col>
        </el-row>

        <!-- 时间与归属 -->
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="归属销售"><el-select v-model="convForm.owner_id" style="width:100%"><el-option v-for="u in salesUsers" :key="u.id" :label="u.name" :value="u.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作日期"><el-date-picker v-model="convForm.cooperation_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="12">
            <el-form-item label="下个付款日">
              <el-date-picker v-model="convForm.next_payment_date" value-format="YYYY-MM-DD" style="width:100%" :disabled="syncPay" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-checkbox v-model="syncPay">下一个付款日默认等于合作日期（首次转单）</el-checkbox>
          </el-col>
        </el-row>

      </el-form>
      <template #footer>
        <el-button @click="convVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitConvert">转正式订单</el-button>
      </template>
    </el-dialog>

    <!-- 新建订单 -->
    <el-dialog title="新建订单" v-model="newVisible" width="720px">
      <el-form :model="newForm" label-width="100px">

        <!-- 签约信息 -->
        <div class="form-section-title"><span class="section-dot"></span>签约信息</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="甲方"><el-input v-model="newForm.party_a" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="乙方"><el-input v-model="newForm.party_b" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="技术提供方"><el-input v-model="newForm.tech_provider" /></el-form-item></el-col>
        </el-row>

        <!-- 产品与价格 -->
        <div class="form-section-title"><span class="section-dot"></span>产品与价格</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="带宽"><el-input v-model="newForm.bandwidth" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="月租(元)"><el-input v-model.number="newForm.monthly_rent" type="number" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作周期"><el-input v-model="newForm.cooperation_period" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作国家"><el-input v-model="newForm.country" placeholder="如 美国" /></el-form-item></el-col>
        </el-row>

        <!-- 客户信息 -->
        <div class="form-section-title"><span class="section-dot"></span>客户信息</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="实际使用方"><el-input v-model="newForm.actual_user" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经办人"><el-input v-model="newForm.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="newForm.contact_phone" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="安装地址"><el-input v-model="newForm.install_address" /></el-form-item></el-col>
        </el-row>

        <!-- 时间与归属 -->
        <div class="form-section-title"><span class="section-dot"></span>时间与归属</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="归属销售" required><el-select v-model="newForm.owner_id" style="width:100%"><el-option v-for="u in salesUsers" :key="u.id" :label="u.name" :value="u.id" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作日期"><el-date-picker v-model="newForm.cooperation_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="下个付款日"><el-date-picker v-model="newForm.next_payment_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        </el-row>

      </el-form>
      <template #footer>
        <el-button @click="newVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitNew">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑订单 -->
    <el-dialog title="编辑订单" v-model="editVisible" width="720px">
      <el-form :model="editForm" label-width="100px">

        <!-- 签约信息 -->
        <div class="form-section-title"><span class="section-dot"></span>签约信息</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="甲方"><el-input v-model="editForm.party_a" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="乙方"><el-input v-model="editForm.party_b" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="技术提供方"><el-input v-model="editForm.tech_provider" /></el-form-item></el-col>
        </el-row>

        <!-- 产品与价格 -->
        <div class="form-section-title"><span class="section-dot"></span>产品与价格</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="带宽"><el-input v-model="editForm.bandwidth" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="月租(元)"><el-input v-model.number="editForm.monthly_rent" type="number" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作周期"><el-input v-model="editForm.cooperation_period" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合作国家"><el-input v-model="editForm.country" placeholder="如 美国" /></el-form-item></el-col>
        </el-row>

        <!-- 客户信息 -->
        <div class="form-section-title"><span class="section-dot"></span>客户信息</div>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="实际使用方"><el-input v-model="editForm.actual_user" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="经办人"><el-input v-model="editForm.handler" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="editForm.contact_phone" /></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="安装地址"><el-input v-model="editForm.install_address" /></el-form-item></el-col>
        </el-row>

        <!-- 时间与归属 -->
        <div class="form-section-title"><span class="section-dot"></span>时间与归属</div>
        <el-row :gutter="16">
          <el-col :span="8"><el-form-item label="归属销售"><el-select v-model="editForm.owner_id" style="width:100%"><el-option v-for="u in salesUsers" :key="u.id" :label="u.name" :value="u.id" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="合作日期"><el-date-picker v-model="editForm.cooperation_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="状态"><el-select v-model="editForm.status" style="width:100%"><el-option label="合作中" value="active" /><el-option label="已结束" value="ended" /></el-select></el-form-item></el-col>
          <el-col :span="24"><el-form-item label="下个付款日"><el-date-picker v-model="editForm.next_payment_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item></el-col>
        </el-row>

      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog title="订单详情" v-model="detailVisible" width="720px">
      <template v-if="current">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ current.order_no }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ current.status === 'active' ? '合作中' : '已结束' }}</el-descriptions-item>
          <el-descriptions-item label="甲方">{{ current.party_a }}</el-descriptions-item>
          <el-descriptions-item label="乙方">{{ current.party_b }}</el-descriptions-item>
          <el-descriptions-item label="技术提供方">{{ current.tech_provider }}</el-descriptions-item>
          <el-descriptions-item label="实际使用方">{{ current.actual_user }}</el-descriptions-item>
          <el-descriptions-item label="经办人">{{ current.handler }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ current.contact_phone }}</el-descriptions-item>
          <el-descriptions-item label="带宽">{{ current.bandwidth }}</el-descriptions-item>
          <el-descriptions-item label="月租">¥{{ fmt(current.monthly_rent) }}</el-descriptions-item>
          <el-descriptions-item label="合作周期">{{ current.cooperation_period }}</el-descriptions-item>
          <el-descriptions-item label="合作日期">{{ current.cooperation_date }}</el-descriptions-item>
          <el-descriptions-item label="下个付款日">{{ current.next_payment_date }}</el-descriptions-item>
          <el-descriptions-item label="归属">{{ current.owner_name }}</el-descriptions-item>
          <el-descriptions-item label="合作国家">{{ current.country }}</el-descriptions-item>
          <el-descriptions-item label="安装地址" :span="2">{{ current.install_address }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Switch } from '@element-plus/icons-vue'
import api from '../api'
import store from '../store/auth'
import { ElMessage } from 'element-plus'

const user = computed(() => store.user)
const isAdmin = computed(() => user.value.role === 'admin')
const list = ref([])
const statusFilter = ref('')
const salesUsers = ref([])
const saving = ref(false)

const approvedOpps = ref([])
const convVisible = ref(false)
const selectedOppId = ref(null)
const syncPay = ref(true)
const convForm = ref(emptyConv())

const newVisible = ref(false)
const newForm = ref(emptyOrder())

const editVisible = ref(false)
const editForm = ref(emptyOrder())
const editId = ref(null)

const detailVisible = ref(false)
const current = ref(null)

function emptyOrder() {
  return {
    party_a: '', party_b: '', tech_provider: '天耘科技', bandwidth: '', monthly_rent: 0,
    cooperation_period: '', cooperation_date: '', actual_user: '', handler: '',
    contact_phone: '', install_address: '', country: '', next_payment_date: '', owner_id: null, status: 'active'
  }
}
function emptyConv() {
  return { ...emptyOrder(), owner_id: null }
}
function fmt(n) {
  if (n == null) return '0'
  return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

async function load() {
  const { data } = await api.get('/orders', { params: { status: statusFilter.value || undefined } })
  list.value = data
}
async function loadSalesUsers() {
  if (!isAdmin.value) return
  const { data } = await api.get('/settings/users')
  salesUsers.value = data.filter(u => u.role === 'sales')
}
onMounted(() => { load(); loadSalesUsers() })

async function openConvert() {
  const { data } = await api.get('/opportunities', { params: { status: 'approved' } })
  approvedOpps.value = data
  convForm.value = emptyConv()
  selectedOppId.value = null
  syncPay.value = true
  convVisible.value = true
}
function onPickOpp(id) {
  const o = approvedOpps.value.find(x => x.id === id)
  if (!o) return
  convForm.value.actual_user = o.company_name
  convForm.value.handler = o.handler
  convForm.value.contact_phone = o.phone
  convForm.value.install_address = o.install_address
  convForm.value.country = o.country
  convForm.value.bandwidth = o.bandwidth
  convForm.value.owner_id = o.submitter_id
}
async function submitConvert() {
  if (!selectedOppId.value) { ElMessage.warning('请选择商机'); return }
  if (!convForm.value.cooperation_date) { ElMessage.warning('请填写合作日期'); return }
  const payload = { ...convForm.value }
  if (syncPay.value) payload.next_payment_date = payload.cooperation_date
  saving.value = true
  try {
    await api.post('/orders/convert/' + selectedOppId.value, payload)
    ElMessage.success('已转为正式订单')
    convVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '转单失败')
  } finally {
    saving.value = false
  }
}

function openNew() {
  newForm.value = emptyOrder()
  newVisible.value = true
}
async function submitNew() {
  if (!newForm.value.owner_id) { ElMessage.warning('请选择归属销售'); return }
  saving.value = true
  try {
    await api.post('/orders', newForm.value)
    ElMessage.success('已创建')
    newVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '创建失败')
  } finally {
    saving.value = false
  }
}

function openEdit(row) {
  current.value = row
  editForm.value = { ...emptyOrder(), ...row }
  editId.value = row.id
  editVisible.value = true
}
async function submitEdit() {
  saving.value = true
  try {
    await api.put('/orders/' + editId.value, editForm.value)
    ElMessage.success('已保存')
    editVisible.value = false
    load()
  } catch (e) {
    ElMessage.error((e.response && e.response.data && e.response.data.detail) || '保存失败')
  } finally {
    saving.value = false
  }
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }

/* 表单区块标题 */
.form-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  padding: 12px 0 6px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 10px;
}
.section-dot {
  display: inline-block;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: linear-gradient(180deg, #409eff, #67c23a);
}
.section-hint {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  margin-left: 4px;
}

/* 紧凑订单表：无横向滚动 */
.compact-table { width: 100%; }
.compact-table :deep(.el-table__header th) {
  background: #f7f8fa !important;
  color: #606266;
  font-weight: 600;
  font-size: 12px;
  padding: 8px 0;
}
.compact-table :deep(.el-table__body td) {
  padding: 10px 0;
  vertical-align: top;
}
.order-info { display: flex; align-items: baseline; gap: 8px; }
.order-no {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}
.order-user { font-size: 13px; color: #303133; font-weight: 500; }
.order-sub { font-size: 12px; color: #909399; margin-top: 3px; }
.col-light { font-size: 12px; color: #909399; margin-top: 2px; }
</style>
