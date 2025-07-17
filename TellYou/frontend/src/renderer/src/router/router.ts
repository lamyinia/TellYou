import {createRouter, createWebHistory, RouteRecordRaw} from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: "/", name: "默认路径",
    redirect: "/login"
  },
  {
    path: "/login", name: "登录", component: () => import("@renderer/views/LoginView.vue")
  },
  {
    path: "/register", name: "注册", component: () => import("@renderer/views/RegisterView.vue")
  },
  {
    path: "/chat", name: "聊天界面", component: () => import("@renderer/views/chat/ChatView.vue")
  }
]
const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes
})

export default router
