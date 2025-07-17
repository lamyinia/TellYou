import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'
import api from '../utils/api'

export const useRegisterStore = defineStore('register', () => {
  const loading = ref(false)
  const error = ref('')
  const success = ref(false)

  async function register(
    username: string,
    password: string,
    confirmPassword: string
  ): Promise<void> {
    error.value = ''
    success.value = false
    if (password !== confirmPassword) {
      error.value = '两次密码不一致'
      return
    }
    loading.value = true
    try {
      const res = await request<{ code: number; info: string }>({
        url: api.register,
        params: { username, password },
        dataType: 'json',
        showLoading: true
      })
      if (res && res.code === 200) {
        success.value = true
      } else {
        error.value = res?.info || '注册失败'
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        error.value = e.message || '网络错误'
      } else {
        error.value = '网络错误'
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, error, success, register }
})
