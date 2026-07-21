<template>
  <!-- 桌面端 -->
  <div v-if="!isMobile">
    <div class="topbar page-toolbar">
      <div class="board-head">
        <span class="board-icon"><el-icon><DataLine /></el-icon></span>
        <div>
          <div class="board-title">销售看板</div>
          <div class="board-sub">月度业绩与订单概览 · 全员可见（{{ month }}）</div>
        </div>
      </div>
      <el-date-picker
        v-model="month"
        type="month"
        value-format="YYYY-MM"
        placeholder="选择月份"
        @change="load"
      />
    </div>

    <el-row :gutter="16" class="cards">
      <el-col :span="8">
        <el-card shadow="hover" class="stat brand-stat">
          <div class="stat-label">月度总业绩（季付×3）</div>
          <div class="stat-value">¥ {{ fmtNum(dashboard.total_performance) }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="stat brand-stat">
          <div class="stat-label">月度总订单量</div>
          <div class="stat-value">{{ dashboard.total_orders }} 单</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="stat brand-stat">
          <div class="stat-label">月度商机</div>
          <div class="stat-value">{{ dashboard.total_opportunities }} 个</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="cards">
      <el-col :span="14">
        <el-card shadow="hover" header="历史销售排行">
          <div v-if="dashboard.ranking.length === 0" class="empty">暂无订单</div>
          <div v-for="(r, i) in dashboard.ranking" :key="r.user_id" class="rank-row">
            <span class="rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <span class="rank-name">{{ r.name }}</span>
            <div class="rank-bar">
              <div class="rank-bar-in" :style="{ width: barWidth(r.order_count) }"></div>
            </div>
            <span class="rank-val">{{ r.order_count }} 单 · ¥ {{ fmtNum(r.performance) }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="hover" header="最近商机" class="stacked">
          <el-table :data="dashboard.recent_opportunities" size="small" max-height="260">
            <el-table-column label="提交时间" width="110">
              <template #default="{ row }">{{ (row.created_at || '').substring(0, 10) }}</template>
            </el-table-column>
            <el-table-column prop="submitter_name" label="提交人" width="80" />
            <el-table-column prop="bandwidth" label="带宽" width="70" />
            <el-table-column prop="country" label="国家" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">{{ oppStatusLabel(row.status) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
        <el-card shadow="hover" header="最近订单">
          <el-table :data="dashboard.recent_orders" size="small" max-height="260">
            <el-table-column prop="actual_user" label="实际使用方" show-overflow-tooltip />
            <el-table-column label="合作日期" width="105">
              <template #default="{ row }">{{ row.cooperation_date || '-' }}</template>
            </el-table-column>
            <el-table-column prop="owner_name" label="归属" width="70" />
            <el-table-column label="月租" width="85">
              <template #default="{ row }">¥{{ fmtNum(row.monthly_rent) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>

  <!-- 移动端 -->
  <div v-else class="m-page">
    <div class="m-head">
      <div class="m-title">销售看板</div>
      <el-date-picker v-model="month" type="month" value-format="YYYY-MM" size="small" @change="load" />
    </div>

    <!-- 加载骨架屏：避免空白等待，命中缓存时不会出现 -->
    <template v-if="loading">
      <div class="m-skel-hero">
        <div class="sk-line w50"></div>
        <div class="sk-line w70 big mt"></div>
        <div class="m-skel-stats">
          <div class="m-skel-stat"><div class="sk-line w45"></div><div class="sk-line w30 mt"></div></div>
          <div class="m-skel-stat"><div class="sk-line w45"></div><div class="sk-line w30 mt"></div></div>
        </div>
      </div>

      <div class="m-section-title">历史销售排行</div>
      <div class="m-card">
        <div class="sk-line w80 mb"></div>
        <div class="sk-line w90 mb"></div>
        <div class="sk-line w65"></div>
      </div>

      <div class="m-section-title">最近商机</div>
      <div class="m-card">
        <div class="sk-line w90 mb"></div>
        <div class="sk-line w80 mb"></div>
        <div class="sk-line w60"></div>
      </div>

      <div class="m-section-title">最近订单</div>
      <div class="m-card">
        <div class="sk-line w90 mb"></div>
        <div class="sk-line w80 mb"></div>
        <div class="sk-line w60"></div>
      </div>
    </template>

    <!-- 真实内容 -->
    <template v-else>
    <div class="m-hero">
      <div class="m-hero-label">本月总业绩（季付×3）</div>
      <div class="m-hero-value">¥ {{ fmtNum(dashboard.total_performance) }}</div>
      <div class="m-hero-stats">
        <div class="m-hero-stat"><div class="v">{{ dashboard.total_orders }}</div><div class="l">签约订单</div></div>
        <div class="m-hero-stat"><div class="v">{{ dashboard.total_opportunities }}</div><div class="l">新增商机</div></div>
      </div>
    </div>

    <div class="m-section-title">历史销售排行</div>
    <div class="m-card">
      <div v-if="dashboard.ranking.length === 0" class="m-empty">
        <div class="ic"><el-icon><DataLine /></el-icon></div>
        <div class="tx">暂无订单</div>
      </div>
      <div v-for="(r, i) in dashboard.ranking" :key="r.user_id" class="m-rank">
        <span class="no" :class="{ top: i < 3 }">{{ i + 1 }}</span>
        <div class="body">
          <div class="name">{{ r.name }}</div>
          <div class="bar"><i :style="{ width: barWidth(r.order_count) }"></i></div>
        </div>
        <div class="val">{{ r.order_count }} 单<br>¥{{ fmtNum(r.performance) }}</div>
      </div>
    </div>

    <div class="m-section-title">最近商机</div>
    <div class="m-card">
      <div v-if="dashboard.recent_opportunities.length === 0" class="m-empty">
        <div class="tx">暂无商机</div>
      </div>
      <div v-for="o in dashboard.recent_opportunities" :key="o.id" class="m-row">
        <div class="m-row-head">
          <div class="m-avatar sm">{{ initial(o.company_name) }}</div>
          <div class="m-row-title">{{ o.company_name }}</div>
          <div class="m-row-date">{{ (o.created_at || '').substring(0, 10) }}</div>
        </div>
        <div class="m-row-meta">{{ o.submitter_name }} · {{ o.bandwidth }} · {{ o.country }}</div>
      </div>
    </div>

    <div class="m-section-title">最近订单</div>
    <div class="m-card">
      <div v-if="dashboard.recent_orders.length === 0" class="m-empty">
        <div class="tx">暂无订单</div>
      </div>
      <div v-for="o in dashboard.recent_orders" :key="o.id" class="m-row">
        <div class="m-row-head">
          <div class="m-avatar sm">{{ initial(o.actual_user) }}</div>
          <div class="m-row-title">{{ o.actual_user }}</div>
          <div class="m-row-date">{{ o.cooperation_date }}</div>
        </div>
        <div class="m-row-meta">{{ o.owner_name }} · ¥{{ fmtNum(o.monthly_rent) }}/月</div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { DataLine } from '@element-plus/icons-vue'
import api from '../api'
import { useDevice } from '../composables/useDevice'

const { isMobile } = useDevice()

const month = ref(curMonth())
const loading = ref(false)
const dashboard = ref({
  month: month.value,
  total_performance: 0,
  total_orders: 0,
  total_opportunities: 0,
  ranking: [],
  recent_orders: [],
  recent_opportunities: []
})

// 看板客户端缓存（按月份 key，30s 内重复进入秒开）
const DASH_CACHE_KEY = 'erp_dashboard_cache'
const DASH_CACHE_TTL = 30 * 1000
function readDashCache(m) {
  try {
    const map = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || '{}')
    const item = map[m]
    if (item && Date.now() - item.ts < DASH_CACHE_TTL) return item.data
  } catch (e) {}
  return null
}
function writeDashCache(m, data) {
  try {
    const map = JSON.parse(localStorage.getItem(DASH_CACHE_KEY) || '{}')
    map[m] = { ts: Date.now(), data }
    localStorage.setItem(DASH_CACHE_KEY, JSON.stringify(map))
  } catch (e) {}
}

function curMonth() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

/**
 * 安全格式化数字：确保入参为纯数字，避免后端返回带 ¥ 前缀的字符串导致重复显示
 */
function fmtNum(n) {
  if (n == null || n === '') return '0'
  // 如果是字符串且包含非数字字符（如 ¥ ,），先清洗
  const cleaned = typeof n === 'string'
    ? parseFloat(String(n).replace(/[^0-9.\-]/g, ''))
    : Number(n)
  if (isNaN(cleaned)) return '0'
  return cleaned.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function maxCount() {
  const vals = dashboard.value.ranking.map(r => r.order_count || 0)
  return Math.max(1, ...vals)
}
function barWidth(v) {
  return Math.round((v / maxCount()) * 100) + '%'
}
function statusTagType(status) {
  const map = { pending: 'warning', approved: 'success', rejected: 'danger', converted: 'info' }
  return map[status] || 'info'
}
function oppStatusLabel(status) {
  const map = { pending: '待审核', approved: '已通过', rejected: '已驳回', converted: '已转单' }
  return map[status] || status || '-'
}
function initial(s) {
  const t = (s || '').trim()
  return t ? t.charAt(0) : '?'
}

async function load() {
  // 命中客户端缓存：立即渲染，无需请求
  const cached = readDashCache(month.value)
  if (cached) {
    dashboard.value = cached
    return
  }
  loading.value = true
  try {
    const { data } = await api.get('/dashboard', { params: { month: month.value } })
    dashboard.value = data
    writeDashCache(month.value, data)
  } catch (e) {
    // token 无效时拦截器已处理跳转，此处静默忽略
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<style scoped>
/* 桌面端样式 */
.board-head { display: flex; align-items: center; gap: 12px; }
.board-icon {
  width: 40px; height: 40px; border-radius: 11px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 21px;
}
.board-title { font-size: 17px; font-weight: 700; color: #1f2d3d; }
.board-sub { font-size: 12px; color: #909399; margin-top: 2px; }
.tip { color: #909399; font-size: 13px; }
.cards { margin-bottom: 16px; }
.stat-label { color: #909399; font-size: 13px; }
.stat-value { font-size: 26px; font-weight: 700; color: #1f2d3d; margin-top: 8px; }
.rank-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.rank-no { width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: #ebeef5; color: #606266; font-size: 12px; }
.rank-no.top { background: #f56c6c; color: #fff; }
.rank-name { width: 70px; font-size: 14px; color: #303133; }
.rank-bar { flex: 1; height: 10px; background: #ebeef5; border-radius: 5px; overflow: hidden; }
.rank-bar-in { height: 100%; background: linear-gradient(90deg, #409eff, #67c23a); }
.rank-val { width: 150px; text-align: right; font-size: 12px; color: #606266; }
.empty { color: #909399; text-align: center; padding: 30px 0; }
.stacked { margin-bottom: 16px; }

/* 移动端加载骨架屏 */
.m-skel-hero {
  background: #fff; border-radius: 20px; padding: 20px 18px; margin-bottom: 12px;
  box-shadow: 0 4px 18px rgba(31, 45, 61, 0.07);
}
.m-skel-hero .m-skel-stats { display: flex; gap: 10px; margin-top: 16px; }
.m-skel-stat { flex: 1; background: #f4f6f9; border-radius: 12px; padding: 10px 12px; }
.sk-line {
  height: 14px; border-radius: 8px;
  background: linear-gradient(90deg, #eef1f5 25%, #e3e8ef 37%, #eef1f5 63%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}
.sk-line.big { height: 28px; }
.sk-line.w30 { width: 30%; } .sk-line.w45 { width: 45%; } .sk-line.w50 { width: 50%; }
.sk-line.w60 { width: 60%; } .sk-line.w65 { width: 65%; } .sk-line.w70 { width: 70%; }
.sk-line.w80 { width: 80%; } .sk-line.w90 { width: 90%; }
.sk-line.mt { margin-top: 8px; }
.sk-line.mb { margin-bottom: 12px; }
@keyframes sk-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
</style>
