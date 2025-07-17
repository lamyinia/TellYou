<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card>
          <v-card-title class="text-h5">登录 - Tell-You</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="onLogin" ref="formRef">
              <v-text-field
                v-model="username"
                label="用户名"
                prepend-inner-icon="mdi-account"
                :disabled="loading"
                required
              />
              <v-text-field
                v-model="password"
                label="密码"
                type="password"
                prepend-inner-icon="mdi-lock"
                :disabled="loading"
                required
              />
              <v-btn type="submit" color="primary" block :loading="loading" :disabled="loading">登录</v-btn>
            </v-form>
            <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
            <v-btn variant="text" @click="goRegister" class="mt-2" block>没有账号？去注册</v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLoginStore } from '../stores/login'
import { instance } from '../utils/request'

const username = ref('')
const password = ref('')
const formRef = ref()
const router = useRouter()
const { loading, error, login } = useLoginStore()

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const onLogin = async () => {
  try {
    const res = await instance.get("/test")
    console.log(res)
  } catch (error: any){
    console.error('登录失败:', error);
  }

  router.push('chat')
  return null

  const ok = await login(username.value, password.value)
  if (ok) {
    router.push('/chat') // 登录成功跳转到主页面（请根据实际路由调整）
  }
}
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const goRegister = () => {
  router.push('/register')
}
</script>
