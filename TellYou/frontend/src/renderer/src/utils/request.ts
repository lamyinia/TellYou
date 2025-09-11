import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, ResponseType } from 'axios'
import Message from './message'
import router from '../router/router'
import { useUserStore } from '@main/store/persist/user-store'

const contentTypeForm = 'application/x-www-form-urlencoded;charset=UTF-8'
const contentTypeJson = 'application/json'
const responseTypeJson: ResponseType = 'json'

interface RequestConfig {
  url: string;
  params?: Record<string, unknown>;
  dataType?: 'form' | 'json';
  showLoading?: boolean;
  responseType?: ResponseType;
  showError?: boolean;
  errorCallback?: (errorData: ApiResponse) => void;
}

interface ApiResponse {
  code: number;
  info: string;
  data?: unknown;
}

interface RequestError {
  showError?: boolean;
  msg?: string;
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

// 请求拦截器
instance.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    const token: string = useUserStore().token
    if (token) {
      config.headers.token = token
    }

    if (config.showLoading) {
      // loading 逻辑
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

// 响应拦截器
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
        // 根据项目需要清理本地登录态
        userStore.$reset()
      } catch {}
      router.push('/login')
      return Promise.reject(error)
    }

    // 5xx：做有限次指数退避重试（仅建议用于幂等请求）
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

const request = <T = ApiResponse>(config: RequestConfig): Promise<T | null> => {
  const {
    url,
    params = {},
    dataType,
    showLoading = true,
    responseType = responseTypeJson,
    showError = true
  } = config

  let contentType = contentTypeForm
  const formData = new FormData()

  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value === undefined ? '' : String(value))
  })

  if (dataType === 'json') {
    contentType = contentTypeJson
  }


  const headers = {
    'Content-Type': contentType,
    'X-Requested-With': 'XMLHttpRequest',
    token: ''
  }

  return instance.post(url, formData, {
    headers,
    showLoading,
    errorCallback: config.errorCallback,
    showError,
    responseType
  } as CustomAxiosRequestConfig)
    .then(response => response as unknown as T)
    .catch((error: RequestError) => {
      if (error.showError && error.msg) {
        Message.error(error.msg)
      }
      return null
    })
}

export { instance }
export default request
export type { ApiResponse, RequestConfig }
