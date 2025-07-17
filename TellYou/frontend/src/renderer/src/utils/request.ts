import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosInstance,
  ResponseType
} from 'axios';
import { ElLoading } from 'element-plus';
import Message from './message';
import router from '../router/router'

type LoadingInstance = ReturnType<typeof ElLoading.service>;

const contentTypeForm = 'application/x-www-form-urlencoded;charset=UTF-8';
const contentTypeJson = 'application/json';
const responseTypeJson: ResponseType = 'json';

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

let loading: LoadingInstance | null = null;

const instance: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10 * 1000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config: CustomAxiosRequestConfig) => {
    if (config.showLoading) {
      loading = ElLoading.service({
        lock: true,
        text: '加载中......',
        background: 'rgba(0, 0, 0, 0.7)',
      });
    }
    return config;
  },
  (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    if (config?.showLoading && loading) {
      loading.close();
    }
    Message.error("请求发送失败");
    return Promise.reject("请求发送失败");
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    if (response.data.status === 401){
      alert('权限不足')
      router.push('/login')
    }
    // response.config.url = response.config.url.replace('/api', '')

    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // const userStore = useUserStore()
      // userStore.clearAuthData()
      // router.push('/login')
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
  } = config;

  let contentType = contentTypeForm;
  const formData = new FormData();

  Object.entries(params).forEach(([key, value]) => {
    formData.append(key, value === undefined ? "" : String(value));
  });

  if (dataType === 'json') {
    contentType = contentTypeJson;
  }

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': contentType,
    'X-Requested-With': 'XMLHttpRequest',
    token: token || ""
  };

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
        Message.error(error.msg);
      }
      return null;
    });
};

export {instance}
export default request;
export type { ApiResponse, RequestConfig };
