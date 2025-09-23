<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, onMounted } from 'vue'
import Avatar from './Avatar.vue'
import UserInfoDrawer from './UserInfoDrawer.vue'
import { useUserStore } from '@main/electron-store/persist/user-store'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const menuList = ref([
  { name: '聊天', icon: 'icon-liaotian', font: 'iconfont2', path: '/chat' },
  { name: '联系管理', icon: 'icon-lianxirenguanli', font: 'iconfont2', path: '/contactManagement' }
])

const goTo = (path: string): void => {
  if (route.path !== path) {
    router.push(path)
  }
}

const openUser = ref(false)

// 从 userStore 获取用户数据
const uid = computed(() => userStore.myId)
const name = computed(() => userStore.nickname || '未命名')
const signature = computed(() => userStore.signature || '这个人很神秘，还没有签名~')
const avatarUrl = computed(() => userStore.avatarUrl || '')

const onSaveProfile = async (payload: {
  uid?: string
  name?: string
  avatarFile?: File | null
  signature?: string
}): Promise<void> => {
  if (payload.name) {
    await userStore.updateUserField('nickname', payload.name)
  }
  if (payload.signature) {
    await userStore.updateUserField('signature', payload.signature)
  }
  openUser.value = false
}

const onLogout = async (): Promise<void> => {
  await userStore.clearUserData()
  router.push('/login')
}

// 确保每次点击都能触发打开（解决偶发无法再次打开的问题）
import { nextTick } from 'vue'
const openUserDrawer = async (): Promise<void> => {
  openUser.value = false
  await nextTick()
  openUser.value = true
}

// 组件挂载时初始化用户数据
onMounted(async () => {
  await userStore.initStore()
})

</script>

<template>
  <div class="right-nav-bar">
    <div class="nav-top">
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
    <div class="nav-bottom">
      <div class="nav-item" :class="{ active: $route.path === '/setting' }" @click="goTo('/setting')">
        <i class="iconfont icon-more2"></i>
        <span class="nav-label">设置</span>
      </div>
      <div class="avatar-entry" @click="openUserDrawer">
        <Avatar :user-id="uid" :url="avatarUrl" :name="name" :size="44" />
      </div>
    </div>
    <UserInfoDrawer v-model="openUser" :uid="uid" :name="name" :signature="signature" @save="onSaveProfile" @logout="onLogout" />
  </div>

</template>

<style scoped>

.right-nav-bar {
  width: 64px;
  background: #111827 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 12px 0;
  height: 100vh;
}
.nav-top { flex: 1; display: flex; flex-direction: column; align-items: center; width: 100%; }
.nav-bottom { display: flex; flex-direction: column; align-items: center; gap: 10px; padding-bottom: 8px; }
.avatar-entry { margin-bottom: 6px; }
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #bbb;
  margin-bottom: 20px;
  cursor: pointer;
  font-size: 28px;
  transition: color 0.2s;
}
.nav-item.active,
.nav-item:hover {
  color: #4caf50;
}
.nav-label { font-size: 13px; margin-top: 4px; }
</style>
