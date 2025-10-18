<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const nickname = ref('')
const gender = ref('')
const formRef = ref()
const router = useRouter()
const isRegistering = ref(false)
const snackbar = ref({ show: false, text: '', color: 'info' as 'success' | 'error' | 'info' })
const _notify = (text: string, color: 'success' | 'error' | 'info' = 'success'): void => {
  snackbar.value = { show: true, text, color }
}
const onRegister = async (): Promise<void> => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(username.value)) {
    _notify('请输入正确的邮箱格式', 'error')
    return
  }
  if (!username.value.endsWith('@test.com')) {
    _notify('测试版邮箱需要以 @test.com 结尾', 'error')
    return
  }
  if (!nickname.value.trim()) {
    _notify('请输入昵称', 'error')
    return
  }
  if (nickname.value.length > 10) {
    _notify('昵称最多10个字符', 'error')
    return
  }
  if (!gender.value) {
    _notify('请选择性别', 'error')
    return
  }
  if (password.value.length < 6) {
    _notify('密码至少6位', 'error')
    return
  }
  const hasNumber = /\d/.test(password.value)
  const hasLetter = /[a-zA-Z]/.test(password.value)
  if (!hasNumber || !hasLetter) {
    _notify('密码至少包含数字和字母', 'error')
    return
  }
  if (password.value !== confirmPassword.value) {
    _notify('两次输入的密码不一致', 'error')
    return
  }

  isRegistering.value = true
  try {
    const response = await window.electronAPI.invoke('proxy:register', {
      email: username.value,
      password: password.value,
      sex: gender.value,
      nickname: nickname.value
    })
    console.log(response)
    if (response.success) {
      setTimeout(() => {
        window.electronAPI.send('device:login-or-register', false)
        router.push({
          path: '/login',
          query: {
            message: '注册成功，请登录',
            type: 'success'
          }
        })
      }, 500)
    } else {
      _notify(response.errMsg, 'error')
    }
  } finally {
    setTimeout(() => {
      isRegistering.value = false
    }, 1500)
  }
}
const goLogin = async (): Promise<void> => {
  const p1 = await window.electronAPI.invoke('device:login-or-register', false)
  const p2 = await router.push('/login')
  await Promise.all([p1, p2])
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title class="text-h5">注册新账号</v-card-title>
          <v-card-text>
            <v-progress-linear v-if="isRegistering" indeterminate color="primary" class="mb-4" />
            <v-form ref="formRef" @submit.prevent="onRegister">
              <v-text-field
                v-model="username"
                label="邮箱，测试版需要以 xxx@test.com结尾，不需要验证码，如 user1@test.com"
                prepend-inner-icon="mdi-account"
                required
              />
              <v-text-field
                v-model="nickname"
                label="昵称"
                prepend-inner-icon="mdi-account-circle"
                required
              />
              <v-select
                v-model="gender"
                label="性别"
                prepend-inner-icon="mdi-gender-male-female"
                :items="[
                  { title: '男', value: 1 },
                  { title: '女', value: 0 }
                ]"
                required
              />
              <v-text-field
                v-model="password"
                label="密码"
                type="password"
                prepend-inner-icon="mdi-lock"
                required
              />
              <v-text-field
                v-model="confirmPassword"
                label="确认密码"
                type="password"
                prepend-inner-icon="mdi-lock"
                required
              />
              <v-btn type="submit" color="primary" block class="mt-4" :loading="isRegistering" :disabled="isRegistering">注册</v-btn>
            </v-form>
            <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
              {{ snackbar.text }}
            </v-snackbar>
            <v-btn variant="text" class="mt-2" block @click="goLogin">已有账号？去登录</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
