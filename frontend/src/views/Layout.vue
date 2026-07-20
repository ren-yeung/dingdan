<template>
  <!-- 桌面端：原有布局，原封不动 -->
  <el-container v-if="!isMobile" class="layout">
    <el-aside width="220px" class="aside">
      <div class="brand">
        <div class="brand-logo"><el-icon><Connection /></el-icon></div>
        <div class="brand-text">
          <div class="brand-name">翼嘉 · 天耘 ERP</div>
          <div class="brand-sub">SD-WAN 专线管理</div>
        </div>
      </div>

      <el-menu
        :default-active="activeMenu"
        router
        class="menu"
        background-color="transparent"
        text-color="#b3bcc7"
        active-text-color="#ffffff"
      >
        <el-menu-item v-for="m in menus" :key="m.name" :index="m.name" :route="{ name: m.name }">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.title }}</span>
        </el-menu-item>
      </el-menu>

      <div class="aside-footer">
        <div class="footer-user">
          <el-icon><User /></el-icon>
          <span>{{ roleLabel }} · {{ user ? user.name : '' }}</span>
        </div>
        <div class="footer-tip">{{ roleTip }}</div>
        <el-divider class="footer-div" />
        <div class="footer-meta">v1.0.0 · MVP 试用版</div>
        <div class="footer-meta">数据由天耘科技维护</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <span class="title">{{ currentTitle }}</span>
        <div class="user">
          <el-tag :type="roleType" size="small">{{ roleLabel }}</el-tag>
          <span class="uname">{{ user ? user.name : '' }}</span>
          <el-button text type="primary" @click="onLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- 移动端：底部导航专属布局 -->
  <div v-else class="m-shell">
    <header class="m-topbar">
      <span class="m-brand">翼嘉 · 天耘 ERP</span>
      <el-button text type="primary" size="small" @click="onLogout">退出</el-button>
    </header>
    <div class="m-content">
      <router-view />
    </div>
    <nav class="m-tabbar">
      <div
        v-for="m in mobileTabs"
        :key="m.name"
        :class="['m-tab', { active: route.name === m.name }]"
        @click="go(m.name)"
      >
        <el-icon><component :is="m.icon" /></el-icon>
        <span>{{ m.title }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import store, { logout } from '../store/auth'
import { useDevice } from '../composables/useDevice'

const { isMobile } = useDevice()
const route = useRoute()
const router = useRouter()

const allMenus = [
  { name: 'home', title: '首页', icon: 'DataLine' },
  { name: 'opportunities', title: '商机', icon: 'Opportunity' },
  { name: 'orders', title: '销售订单', icon: 'List' },
  { name: 'settings', title: '系统设置', icon: 'Setting', adminOnly: true }
]

const menus = computed(() => allMenus.filter(m => !m.adminOnly || (store.user && store.user.role === 'admin')))
const mobileTabs = computed(() => menus.value)
const activeMenu = computed(() => route.name)
const currentTitle = computed(() => {
  const m = allMenus.find(x => x.name === route.name)
  return m ? m.title : ''
})
const user = computed(() => store.user)
const roleLabel = computed(() => {
  const r = store.user && store.user.role
  return { admin: '管理员', manager: '销售主管', sales: '销售' }[r] || r
})
const roleType = computed(() => {
  const r = store.user && store.user.role
  return { admin: 'danger', manager: 'warning', sales: 'success' }[r] || 'info'
})
const roleTip = computed(() => {
  const r = store.user && store.user.role
  return {
    admin: '拥有全部权限：审核商机、测试转订单、编辑订单、用户与产品管理。',
    manager: '可查看全部销售数据，审批前可修改销售提交的测试。',
    sales: '仅可提交测试需求、查看本人订单与商机。'
  }[r] || ''
})

function go(name) {
  if (route.name === name) return
  router.push({ name })
}
function onLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.layout { height: 100%; }
.aside {
  background: linear-gradient(180deg, #243240 0%, #1b2733 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.brand {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  background: rgba(0, 0, 0, 0.18);
}
.brand-logo {
  width: 38px; height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.brand-name { color: #fff; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; }
.brand-sub { color: #8b97a3; font-size: 11px; margin-top: 2px; }

.menu { flex: 1; border-right: none; padding: 10px 12px; }
.menu :deep(.el-menu-item) {
  position: relative;
  height: 46px;
  line-height: 46px;
  border-radius: 8px;
  margin: 4px 0;
  color: #b3bcc7;
}
.menu :deep(.el-menu-item):hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.22), rgba(103, 194, 58, 0.10));
  color: #fff;
  font-weight: 600;
}
.menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0; top: 11px; bottom: 11px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #409eff;
}

.aside-footer {
  padding: 14px 18px 18px;
  color: #8b97a3;
  font-size: 11px;
}
.footer-user {
  display: flex; align-items: center; gap: 6px;
  color: #c0c4cc; font-size: 12px; margin-bottom: 8px;
}
.footer-tip {
  line-height: 1.6;
  color: #7a8794;
  font-size: 11px;
  margin-bottom: 10px;
}
.footer-div { margin: 10px 0; border-color: rgba(255, 255, 255, 0.08); }
.footer-meta { line-height: 1.7; color: #6f7c89; font-size: 11px; }

.header {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-bottom: 1px solid #ebeef5;
}
.title { font-size: 18px; font-weight: 600; color: #303133; }
.user { display: flex; align-items: center; gap: 10px; }
.uname { color: #606266; font-size: 14px; }
.main { background: #f5f7fa; }

/* ===== 移动端外壳 ===== */
.m-shell { display: flex; flex-direction: column; height: 100%; background: var(--page-bg); }
.m-topbar {
  height: 50px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 14px; background: #1b2733; color: #fff;
}
.m-brand { font-weight: 700; font-size: 15px; letter-spacing: 0.5px; }
.m-topbar :deep(.el-button) { color: #9fd0ff; margin: 0; }
.m-content { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.m-tabbar {
  height: 56px; flex-shrink: 0;
  display: flex; background: #fff; border-top: 1px solid #ebeef5;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
}
.m-tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; color: #909399; font-size: 11px; cursor: pointer; user-select: none;
}
.m-tab .el-icon { font-size: 20px; }
.m-tab.active { color: #409eff; font-weight: 600; }
</style>
