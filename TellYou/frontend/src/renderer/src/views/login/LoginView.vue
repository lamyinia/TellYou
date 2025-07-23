<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { instance } from '../../utils/request'
import { getUserStore } from '../../../../main/stores/GlobalStore'
import { api } from '@renderer/utils/api'

const userStore = getUserStore()
const username = ref('')
const password = ref('')
const formRef = ref()
const router = useRouter()
const loading = ref(0)
const error = ref(0)

const onLogin = async () => {
  try {
    const res = await instance.post(api.login, {
      email: username.value,
      password: password.value
    })
    const token:string = res.data.data?.token
    if (token !== null){
      userStore.setToken(token)
      console.log(userStore.token)

      window.electronAPI.send('LoginSuccess')
    } else {
      throw new Error(res.data)
    }
  } catch (error: unknown) {
    console.error('登录失败:', error)
  }
}

const goRegister = () => {
  window.electronAPI.send('LoginOrRegister', 1)
  router.push('/register')
}
</script>


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
                required
              />
              <v-text-field
                v-model="password"
                label="密码"
                type="password"
                prepend-inner-icon="mdi-lock"
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

