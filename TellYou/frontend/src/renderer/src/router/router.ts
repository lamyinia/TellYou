import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: "/", name: "默认路径",
    redirect: "/login"
  },
  {
    path: "/login", name: "登录", component: () => import("@renderer/views/account/LoginView.vue")
  },
  {
    path: "/register", name: "注册", component: () => import("@renderer/views/account/RegisterView.vue")
  },

  {
    path: "/main",
    redirect: "/setting",
    name: "主窗口",
    component: () => import("@renderer/views/Main.vue"),
    children: [
      {
        path: "/chat", name: "聊天界面", component: () => import("@renderer/views/chat/ChatView.vue")
      },
      {
        path: "/contactManagement", name: "联系人管理", component: () => import("@renderer/views/relation/ContactManagementView.vue")
      },
      {
        path: "/setting", name: "设置", component: () => import("@renderer/views/setting/SettingView.vue")
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes
})

export default router
