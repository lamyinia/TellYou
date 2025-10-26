<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, nextTick, onMounted, ref } from 'vue'
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
const uid = computed(() => userStore.myId)
const name = computed(() => userStore.nickname || '未命名')
const signature = computed(() => userStore.signature || '这个人很神秘，还没有签名~')
const showStrategy = 'thumbedAvatarUrl'
const avatarUrl = computed(() => {  // 我写的代码真是一坨糊出来的狗屎
  console.log('标记', userStore.avatarUrl)
  const split = userStore.avatarUrl.split('/')
  split[5] = 'thumb'
  return split.join('/')
  // const url =  // http://113.44.158.255:32788/lanye/avatar/original/1948031012053333361/8/index.avif
  // return userStore.avatarUrl || ''
})

const onLogout = async (): Promise<void> => {
  await userStore.clearUserData()
  // 清除Main.vue初始化状态，下次登录时重新初始化
  sessionStorage.removeItem('main-initialized')
  router.push('/login')
}

const openUserDrawer = async (): Promise<void> => {
  openUser.value = false
  await nextTick()
  openUser.value = true
}
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
      <div
        class="nav-item"
        :class="{ active: $route.path === '/setting' }"
        @click="goTo('/setting')"
      >
        <i class="iconfont icon-more2"></i>
        <span class="nav-label">设置</span>
      </div>
      <div class="avatar-entry" @click="openUserDrawer">
        <Avatar :user-id="uid" :url="avatarUrl" :show-strategy="showStrategy" :name="name" :size="44" />
      </div>
    </div>
    <UserInfoDrawer
      v-model="openUser"
      :uid="uid"
      :name="name"
      :signature="signature"
      @logout="onLogout"
    />
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
.nav-top {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.nav-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
}
.avatar-entry {
  margin-bottom: 6px;
}
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
.nav-label {
  font-size: 13px;
  margin-top: 4px;
}
</style>
