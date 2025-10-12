# Axios 最佳实践指南

## 概述

本文档基于 TellYou 项目的 `net-util.ts` 实现，总结了在 Electron + TypeScript 环境中使用 Axios 的最佳实践。

## 1. 实例配置最佳实践

### 1.1 多实例策略

```typescript
// ✅ 推荐：根据用途分离实例
const masterInstance = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_REQUEST_URL,
  timeout: 180 * 1000,  // 业务请求较长超时
  headers: {
    'Content-Type': 'application/json'
  }
})

const minioInstance = axios.create({
  timeout: 30 * 1000,   // 文件操作较短超时
  headers: {
    'Content-Type': 'application/octet-stream'
  }
})

// ❌ 不推荐：单一实例处理所有请求
const singleInstance = axios.create({
  timeout: 30000  // 无法满足不同场景需求
})
```

### 1.2 环境变量配置

```typescript
// ✅ 推荐：使用环境变量
const masterInstance = axios.create({
  baseURL: import.meta.env.VITE_REQUEST_URL,
  timeout: import.meta.env.VITE_REQUEST_TIMEOUT || 180000
})

// ❌ 不推荐：硬编码配置
const masterInstance = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 180000
})
```

## 2. 拦截器最佳实践

### 2.1 请求拦截器

```typescript
// ✅ 推荐：自动添加认证信息
masterInstance.interceptors.request.use(
  (config) => {
    const token = store.get(tokenKey)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// ✅ 推荐：添加请求 ID 用于追踪
masterInstance.interceptors.request.use(
  (config) => {
    config.headers['X-Request-ID'] = generateRequestId()
    return config
  }
)
```

### 2.2 响应拦截器

```typescript
// ✅ 推荐：统一错误处理
masterInstance.interceptors.response.use(
  (response) => {
    // 成功响应直接返回
    return response
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 处理未授权
          handleUnauthorized()
          break
        case 403:
          // 处理权限不足
          handleForbidden()
          break
        case 429:
          // 处理限流
          handleRateLimit()
          break
        case 500:
          // 处理服务器错误
          handleServerError()
          break
      }
      
      throw new ApiError(status, data?.message || '请求失败', error.response)
    } else if (error.request) {
      // 网络错误
      throw new ApiError(-1, '网络连接异常')
    } else {
      // 其他错误
      throw new ApiError(-2, error.message)
    }
  }
)
```

## 3. 错误处理最佳实践

### 3.1 自定义错误类

```typescript
// ✅ 推荐：定义业务错误类
class ApiError extends Error {
  constructor(
    public errCode: number,
    public message: string,
    public response?: AxiosResponse,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ✅ 推荐：错误类型枚举
enum ErrorCode {
  NETWORK_ERROR = -1,
  TIMEOUT_ERROR = -2,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500
}
```

### 3.2 错误处理策略

```typescript
// ✅ 推荐：分层错误处理
async function handleApiRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn()
  } catch (error) {
    if (error instanceof ApiError) {
      // 业务错误处理
      switch (error.errCode) {
        case ErrorCode.UNAUTHORIZED:
          await redirectToLogin()
          break
        case ErrorCode.FORBIDDEN:
          showPermissionDeniedMessage()
          break
        case ErrorCode.SERVER_ERROR:
          if (error.retryable) {
            return await retryRequest(requestFn)
          }
          break
      }
      throw error
    } else if (error instanceof AxiosError) {
      // 网络错误处理
      throw new ApiError(ErrorCode.NETWORK_ERROR, '网络连接失败')
    } else {
      // 未知错误
      throw new ApiError(-999, '未知错误')
    }
  }
}
```

## 4. 类型安全最佳实践

### 4.1 响应类型定义

```typescript
// ✅ 推荐：定义标准响应格式
interface ApiResponse<T = unknown> {
  data: T
  success: boolean
  errCode: number
  errMsg: string
  timestamp: number
}

// ✅ 推荐：分页响应类型
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ✅ 推荐：业务实体类型
interface User {
  id: number
  name: string
  email: string
  avatar?: string
  createdAt: string
  updatedAt: string
}
```

### 4.2 泛型约束

```typescript
// ✅ 推荐：方法级泛型约束
class NetMaster {
  public async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.get(url, config)
  }
  
  public async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.post(url, data, config)
  }
}

// ✅ 推荐：使用时的类型约束
const response = await netMaster.get<User[]>('/api/users')
const users: User[] = response.data.data
```

## 5. 文件操作最佳实践

### 5.1 文件上传

```typescript
// ✅ 推荐：文件类型验证
function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

// ✅ 推荐：文件大小验证
function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

// ✅ 推荐：上传进度监控
async function uploadWithProgress(
  url: string, 
  file: File, 
  onProgress?: (progress: number) => void
): Promise<AxiosResponse> {
  return axios.put(url, file, {
    headers: {
      'Content-Type': file.type,
      'Content-Length': file.size.toString()
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  })
}
```

### 5.2 文件下载

```typescript
// ✅ 推荐：流式下载大文件
async function downloadLargeFile(
  url: string, 
  filename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'stream',
    onDownloadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    }
  })
  
  const writer = fs.createWriteStream(filename)
  response.data.pipe(writer)
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}
```

## 6. 性能优化最佳实践

### 6.1 请求去重

```typescript
// ✅ 推荐：请求去重机制
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()
  
  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }
    
    const promise = requestFn()
    this.pendingRequests.set(key, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      this.pendingRequests.delete(key)
    }
  }
}
```

### 6.2 请求缓存

```typescript
// ✅ 推荐：内存缓存
class RequestCache {
  private cache = new Map<string, { data: any, timestamp: number }>()
  
  async getWithCache<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    ttl: number = 300000
  ): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }
    
    const data = await requestFn()
    this.cache.set(key, { data, timestamp: Date.now() })
    return data
  }
  
  clear(): void {
    this.cache.clear()
  }
}
```

### 6.3 批量请求

```typescript
// ✅ 推荐：批量请求处理
async function batchRequest<T>(
  requests: (() => Promise<T>)[],
  concurrency: number = 5
): Promise<T[]> {
  const results: T[] = []
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(request => request()))
    results.push(...batchResults)
  }
  
  return results
}
```

## 7. 安全最佳实践

### 7.1 认证管理

```typescript
// ✅ 推荐：Token 自动刷新
class TokenManager {
  private refreshPromise: Promise<string> | null = null
  
  async getValidToken(): Promise<string> {
    const token = store.get(tokenKey)
    if (this.isTokenValid(token)) {
      return token
    }
    
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken()
    }
    
    return this.refreshPromise
  }
  
  private async refreshToken(): Promise<string> {
    try {
      const response = await axios.post('/api/auth/refresh')
      const newToken = response.data.token
      store.set(tokenKey, newToken)
      return newToken
    } finally {
      this.refreshPromise = null
    }
  }
}
```

### 7.2 请求签名

```typescript
// ✅ 推荐：请求签名验证
function signRequest(config: AxiosRequestConfig): AxiosRequestConfig {
  const timestamp = Date.now().toString()
  const nonce = generateNonce()
  const signature = generateSignature(config, timestamp, nonce)
  
  config.headers = {
    ...config.headers,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature
  }
  
  return config
}
```

## 8. 监控和日志最佳实践

### 8.1 请求日志

```typescript
// ✅ 推荐：结构化日志
class RequestLogger {
  logRequest(config: AxiosRequestConfig, response?: AxiosResponse, error?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: config.method?.toUpperCase(),
      url: config.url,
      status: response?.status,
      duration: response?.config?.metadata?.startTime 
        ? Date.now() - response.config.metadata.startTime 
        : undefined,
      error: error ? {
        code: error.code,
        message: error.message,
        stack: error.stack
      } : undefined
    }
    
    console.log('API Request:', JSON.stringify(logData, null, 2))
  }
}
```

### 8.2 性能监控

```typescript
// ✅ 推荐：性能指标收集
class PerformanceMonitor {
  private metrics = new Map<string, number[]>()
  
  recordRequest(url: string, duration: number): void {
    if (!this.metrics.has(url)) {
      this.metrics.set(url, [])
    }
    
    const durations = this.metrics.get(url)!
    durations.push(duration)
    
    // 只保留最近100次记录
    if (durations.length > 100) {
      durations.shift()
    }
  }
  
  getAverageDuration(url: string): number {
    const durations = this.metrics.get(url)
    if (!durations || durations.length === 0) return 0
    
    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length
  }
}
```

## 9. 测试最佳实践

### 9.1 Mock 配置

```typescript
// ✅ 推荐：测试环境 Mock
if (process.env.NODE_ENV === 'test') {
  const mockAdapter = require('axios-mock-adapter')
  const mock = new mockAdapter(axios)
  
  mock.onGet('/api/users').reply(200, {
    data: [{ id: 1, name: 'Test User' }],
    success: true,
    errCode: 0,
    errMsg: ''
  })
}
```

### 9.2 单元测试

```typescript
// ✅ 推荐：网络请求测试
describe('NetMaster', () => {
  let netMaster: NetMaster
  
  beforeEach(() => {
    netMaster = new NetMaster(axios.create())
  })
  
  it('should handle successful requests', async () => {
    const mockResponse = { data: { id: 1, name: 'Test' }, success: true }
    jest.spyOn(axios, 'get').mockResolvedValue({ data: mockResponse })
    
    const result = await netMaster.get('/api/users')
    expect(result.data).toEqual(mockResponse)
  })
  
  it('should handle API errors', async () => {
    const mockError = new ApiError(400, 'Bad Request')
    jest.spyOn(axios, 'get').mockRejectedValue(mockError)
    
    await expect(netMaster.get('/api/users')).rejects.toThrow(ApiError)
  })
})
```

## 10. 常见陷阱和解决方案

### 10.1 内存泄漏

```typescript
// ❌ 问题：未清理的拦截器
const interceptorId = axios.interceptors.request.use(config => config)
// 忘记清理会导致内存泄漏

// ✅ 解决：正确清理拦截器
const interceptorId = axios.interceptors.request.use(config => config)
axios.interceptors.request.eject(interceptorId)
```

### 10.2 并发请求问题

```typescript
// ❌ 问题：无限制并发请求
const promises = userIds.map(id => netMaster.get(`/api/users/${id}`))
await Promise.all(promises) // 可能导致服务器压力过大

// ✅ 解决：限制并发数量
const concurrency = 5
const results = []
for (let i = 0; i < userIds.length; i += concurrency) {
  const batch = userIds.slice(i, i + concurrency)
  const batchResults = await Promise.all(
    batch.map(id => netMaster.get(`/api/users/${id}`))
  )
  results.push(...batchResults)
}
```

### 10.3 超时处理

```typescript
// ❌ 问题：超时后继续处理
try {
  const response = await netMaster.get('/api/slow-endpoint')
  // 处理响应
} catch (error) {
  // 超时错误和业务错误混在一起
}

// ✅ 解决：区分超时和业务错误
try {
  const response = await netMaster.get('/api/slow-endpoint')
  // 处理响应
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    // 处理超时
    showTimeoutMessage()
  } else if (error instanceof ApiError) {
    // 处理业务错误
    handleBusinessError(error)
  }
}
```

## 总结

通过遵循这些最佳实践，可以构建出：

1. **类型安全**的网络请求系统
2. **健壮**的错误处理机制
3. **高性能**的请求优化
4. **安全**的认证和授权
5. **可维护**的代码结构

这些实践不仅适用于 TellYou 项目，也可以作为其他 Electron + TypeScript 项目的参考标准。
