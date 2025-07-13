import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosInstance,
  ResponseType
} from 'axios';
import { ElLoading } from 'element-plus';
import Message from './Message';
import Api from './Api';

// 定义 Loading 实例的类型
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
  baseURL: (import.meta.env.PROD ? Api.prodDomain : "") + "/api",
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
  (response: AxiosResponse) => {
    const config = response.config as CustomAxiosRequestConfig;
    const { showLoading, errorCallback, showError = true, responseType } = config;

    if (showLoading && loading) {
      loading.close();
    }

    const responseData: ApiResponse = response.data;

    // 处理二进制响应
    if (responseType === "arraybuffer" || responseType === "blob") {
      return responseData;
    }

    // 处理不同状态码
    switch (responseData.code) {
      case 200:
        return responseData;
      case 901:
        setTimeout(() => {
          if (window.ipcRenderer) {
            window.ipcRenderer.send('reLogin');
          }
        }, 2000);
        return Promise.reject({ showError: true, msg: "登录超时" });
      default:
        if (errorCallback) {
          errorCallback(responseData);
        }
        return Promise.reject({
          showError: showError,
          msg: responseData.info || "未知错误"
        });
    }
  },
  (error: AxiosError) => {
    const config = error.config as CustomAxiosRequestConfig;
    if (config?.showLoading && loading) {
      loading.close();
    }
    return Promise.reject({ showError: true, msg: "网络异常" });
  }
);

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

export default request;
export type { ApiResponse, RequestConfig };
