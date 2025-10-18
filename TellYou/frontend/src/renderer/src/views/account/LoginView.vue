<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@main/electron-store/persist/user-store'

const userStore = useUserStore()
const username = ref('')
const password = ref('')
const formRef = ref()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const errorMessage = ref('')
const snackbar = ref({
  show: false,
  text: '',
  color: 'info' as 'success' | 'error' | 'info'
})
const _notify = (text: string, color: 'success' | 'error' | 'info' = 'success'): void => {
  snackbar.value = { show: true, text, color }
}

const handleWsConnected = (): void => {
  console.log('WebSocket连接成功，跳转到主页面')
  router.push('/main')
  userStore.setLoginStatus(true)
  loading.value = false
}
onMounted(() => {
  console.log('监听器挂载 handleWsConnected')
  window.electronAPI.onWsConnected(handleWsConnected)

  const message = route.query.message as string
  const type = route.query.type as string
  if (message && type) {
    _notify(message, type as 'success' | 'error' | 'info')
    router.replace({ path: '/login' }) // 清除URL中的查询参数，避免刷新页面时重复显示
  }
})
onUnmounted(() => {
  console.log('监听器移除 handleWsConnected')
  window.electronAPI.offWsConnected(handleWsConnected)
})
const onLogin = async (): Promise<void> => {
  try {
    loading.value = true
    errorMessage.value = '' // 清空之前的错误信息

    const data: any = await window.electronAPI.invoke('proxy:login', {
      email: username.value,
      password: password.value
    })
    console.log(data)

    const uid = data?.uid

    if (data?.token && uid) {
      await userStore.setUserData(data)
      window.electronAPI.send('LoginSuccess', uid)
    } else {
      throw new Error('响应被拦截')
    }
  } catch (error: any) {
    loading.value = false
    console.error('登录失败:', error)
    if (error?.message) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = '登录失败，请检查网络连接或稍后重试'
    }
  }
}
const goRegister = async (): Promise<void> => {
  const p1 = window.electronAPI.invoke('device:login-or-register', true)
  const p2 = router.push('/register')
  await Promise.all([p1, p2])
}
const goTotest = async (): Promise<void> => {
  window.electronAPI.invoke('test').then()
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title class="text-h5">登录 - Tell-You</v-card-title>
          <!--          <v-alert type="success" closable> display </v-alert>-->
          <v-card-text>
            <v-form @submit.prevent="onLogin" ref="formRef">
              <v-text-field
                v-model="username"
                label="用户名"
                prepend-inner-icon="mdi-account"
                required
              />
              <v-text-field
                v-model="password"
                label="密码"
                type="password"
                prepend-inner-icon="mdi-lock"
                required
              />
              <v-btn type="submit" color="primary" block :loading="loading" :disabled="loading"
                >登录</v-btn
              >
            </v-form>
            <div v-if="loading" class="loading-mask">
              <img src="@renderer/assets/img/wifi.gif" alt="loading" />
            </div>
            <v-alert
              v-if="errorMessage"
              type="error"
              class="mt-2"
              closable
              @click:close="errorMessage = ''"
            >
              {{ errorMessage }}
            </v-alert>
            <v-btn variant="text" @click="goRegister" class="mt-2" block>没有账号？去注册</v-btn>
            <!--            <v-btn variant="text" @click="goTotest" class="mt-2" block>测试按钮</v-btn>-->
            <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
              {{ snackbar.text }}
            </v-snackbar>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style>
.loading-mask {
  width: 100%;
  height: 100%;
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
</style>
