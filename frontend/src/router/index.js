import { createRouter, createWebHashHistory } from 'vue-router'
import store from '../store/auth'
import Login from '../views/Login.vue'
import Layout from '../views/Layout.vue'
import Home from '../views/Home.vue'
import Opportunities from '../views/Opportunities.vue'
import Orders from '../views/Orders.vue'
import Settings from '../views/Settings.vue'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: Layout,
    redirect: '/home',
    children: [
      { path: 'home', name: 'home', component: Home, meta: { title: '首页', icon: 'DataLine' } },
      { path: 'opportunities', name: 'opportunities', component: Opportunities, meta: { title: '商机', icon: 'Opportunity' } },
      { path: 'orders', name: 'orders', component: Orders, meta: { title: '销售订单', icon: 'List' } },
      { path: 'settings', name: 'settings', component: Settings, meta: { title: '系统设置', icon: 'Setting', adminOnly: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!store.token) return '/login'
  if (to.meta.adminOnly && store.user && store.user.role !== 'admin') {
    return '/home'
  }
  return true
})

export default router
