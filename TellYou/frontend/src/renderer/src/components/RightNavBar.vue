<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref } from 'vue'

const router = useRouter()
const route = useRoute()

const menuList = ref([
  { name: '聊天', icon: 'icon-liaotian', font: 'iconfont2', path: '/chat' },
  { name: '联系管理', icon: 'icon-lianxirenguanli', font: 'iconfont2', path: '/contactManagement' },
  { name: '设置', icon: 'icon-more2', font: 'iconfont', path: '/setting' }
])

const goTo = (path: string): void => {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <div class="right-nav-bar">
    <div
      v-for="item in menuList"
      :key="item.name"
      :class="['nav-item', { active: $route.path === item.path }]"
      @click="goTo(item.path)"
    >
      <i :class="[item.font, item.icon]"></i>
      <span class="nav-label">{{ item.name }}</span>
    </div>
  </div>
</template>

<style scoped>

.right-nav-bar {
  width: 64px;
  background: #111827 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  height: 100vh;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bbb;
  margin-bottom: 32px;
  cursor: pointer;
  font-size: 24px;
  transition: color 0.2s;
}
.nav-item.active,
.nav-item:hover {
  color: #4caf50;
}
.nav-label {
  font-size: 12px;
  margin-top: 4px;
}
</style>
