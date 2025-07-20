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
import { useLoginStore } from '../../stores/login'
import { instance } from '../../utils/request'
import { getUserStore } from '@renderer/stores/GlobalStore'

const userStore = getUserStore()
const username = ref('')
const password = ref('')
const formRef = ref()
const router = useRouter()
const { loading, error } = useLoginStore()

const onLogin = async () => {
    try {
      const res = await instance.get("/test")
      console.log(res)
      window.ipcRenderer.send('LoginSuccess')
      userStore.isLogin = true
      router.push('/main')
    } catch (error: unknown) {
      console.error('登录失败:', error)
    }
}

const goRegister = () => {
  window.ipcRenderer.send('LoginOrRegister', 1)
  router.push('/register')
}
</script>
