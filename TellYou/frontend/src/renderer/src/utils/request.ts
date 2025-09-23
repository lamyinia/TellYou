import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Message from './message'
import { useUserStore } from '@main/electron-store/persist/user-store'

interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}
export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public response?: AxiosResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean;
  errorCallback?: (errorData: ApiResponse) => void;
  showError?: boolean;
}

const axio: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10 * 1000,
  headers: {
    'Content-Type': 'application/json'
  }
})

axio.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    const token: string = useUserStore().token
    if (token) {
      config.headers.token = token
    }
    // console.log('请求体配置', config)
    return config
  },
  (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig
    if (config?.showLoading && loading) {
      loading.close()
    }
  /*
      axios.get('/api/data', {
        showLoading: true, // 自定义属性
        timeout: 5000     // 标准属性
      } as CustomAxiosRequestConfig)
  */
    Message.error('请求发送失败')
    return Promise.reject('请求发送失败')
  }
)

axio.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data, errCode, errMsg, success } = response.data
    if (success) {
      return data
    } else {
      throw new ApiError(errCode, errMsg, response)
    }
  },
  (error: AxiosError) => {
    if (error.response){
      const status = error.status
      console.log('request.ts 里的 AxiosError', error)

      switch (status) {
        case 401:
          break
        case 403:
          break
        case 404:
          break
        case 500:
          break
      }

      throw new ApiError(status, error.response.data.errMsg, error.response)
    } else {
      throw new ApiError(-1, '网络连接异常');
    }
  }
)


export { axio, getRequest }
export type { ApiResponse, RequestConfig }
