import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: '默认路径',
    redirect: '/login'
  },
  {
    path: '/login',
    name: '登录',
    component: () => import('@renderer/views/account/LoginView.vue')
  },
  {
    path: '/register',
    name: '注册',
    component: () => import('@renderer/views/account/RegisterView.vue')
  },
  {
    path: '/debug',
    name: '调试窗口',
    component: () => import('@renderer/debug/Debug.vue')
  },

  {
    path: '/main',
    redirect: '/contactManagement',
    name: '主窗口',
    component: () => import('@renderer/views/Main.vue'),
    children: [
      {
        path: '/chat',
        name: '聊天界面',
        component: () => import('@renderer/views/chat/Chat.vue')
      },
      {
        path: '/contactManagement',
        name: '联系人管理',
        component: () => import('@renderer/views/relation/ContactManagementView.vue')
      },
      {
        path: '/setting',
        name: '设置',
        component: () => import('@renderer/views/setting/SettingView.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.VITE_BASE_URL),
  routes
})

export default router
