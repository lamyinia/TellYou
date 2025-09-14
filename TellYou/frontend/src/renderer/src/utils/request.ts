import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, ResponseType } from 'axios'
import Message from './message'
import router from '../router/router'
import { useUserStore } from '@main/store/persist/user-store'

interface ApiResponse {
  code: number;
  info: string;
  data?: unknown;
}

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean;
  errorCallback?: (errorData: ApiResponse) => void;
  showError?: boolean;
}


const instance: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10 * 1000
})

instance.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    const token: string = useUserStore().token
    if (token) {
      config.headers.token = token
    }

    if (config.showLoading) {

    }
    return config
  },
  (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig
    if (config?.showLoading && loading) {
      loading.close()
    }
    Message.error('请求发送失败')
    return Promise.reject('请求发送失败')
  }
)

instance.interceptors.response.use(
  (response) => {
    if (response.data.status === 401) {
      alert('权限不足')
      router.push('/login')
    }
    // response.config.url = response.config.url.replace('/api', '')

    return response
  },
  (error) => {
    const status = error?.response?.status
    const config = (error?.config || {}) as any

    // 401/403：鉴权失败，清理并跳登录（或触发刷新逻辑，根据实际需要调整）
    if (status === 401 || status === 403) {
      try {
        const userStore = useUserStore()
        userStore.$reset()
      } catch {}
      router.push('/login')
      return Promise.reject(error)
    }

    if (status >= 500) {
      config.__retryCount = (config.__retryCount || 0) + 1
      const maxRetries = 3
      if (config.__retryCount <= maxRetries) {
        const delays = [200, 800, 2000]
        const delay = delays[Math.min(config.__retryCount - 1, delays.length - 1)]
        return new Promise((resolve) => setTimeout(resolve, delay)).then(() => instance(config))
      }
    }

    return Promise.reject(error)
  }
)


export { instance, getRequest }
export type { ApiResponse, RequestConfig }
