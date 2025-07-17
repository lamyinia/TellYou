import { defineStore } from 'pinia'
import { ref } from 'vue'
import request from '../utils/request'
import api from '../utils/api'

export const useLoginStore = defineStore('login', () => {
  const loading = ref(false)
  const error = ref('')

  async function login(username: string, password: string) {
    error.value = ''
    loading.value = true

    try {
      const res = await request<{ code: number; info: string; token?: string }>({
        url: api.login,
        params: { username, password },
        dataType: 'json',
        showLoading: true
      })
      if (res && res.code === 200) {
        if (res.token) localStorage.setItem('token', res.token)
        return true
      } else {
        error.value = res?.info || '登录失败'
        return false
      }
    } catch (e: any) {
      error.value = e?.message || '网络错误'
      return false
    } finally {
      loading.value = false
    }
  }
  return { loading, error, login }
})

