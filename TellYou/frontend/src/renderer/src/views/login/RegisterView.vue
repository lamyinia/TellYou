<template>
    <v-container class="fill-height" fluid>
      <v-row align="center" justify="center">
        <v-col cols="12" sm="8" md="4">
          <v-card>
            <v-card-title class="text-h5">注册新账号</v-card-title>
            <v-card-text>
              <v-form @submit.prevent="onRegister" ref="formRef">
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
                <v-text-field
                  v-model="confirmPassword"
                  label="确认密码"
                  type="password"
                  prepend-inner-icon="mdi-lock"
                  :disabled="loading"
                  required
                />
                <v-btn
                  type="submit"
                  color="primary"
                  block
                  :loading="loading"
                  :disabled="loading"
                  class="mt-4"
                >注册</v-btn>
              </v-form>
              <v-alert v-if="error" type="error" class="mt-2">{{ error }}</v-alert>
              <v-alert v-if="success" type="success" class="mt-2">注册成功！请前往登录</v-alert>
              <v-btn variant="text" @click="goLogin" class="mt-2" block>已有账号？去登录</v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </template>

  <script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useRegisterStore } from '../../stores/register'

  const username = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const formRef = ref()
  const router = useRouter()
  const { loading, error, success, register } = useRegisterStore()

  const onRegister = async () => {
    await register(username.value, password.value, confirmPassword.value)
  }

  const goLogin = () => {
    window.ipcRenderer.send('LoginOrRegister', 0)
    router.push('/login')
  }
  </script>
