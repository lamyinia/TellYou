# NetUtil 网络工具类文档

## 概述

`net-util.ts` 是 TellYou 项目的核心网络工具模块，提供了基于 Axios 的 HTTP 客户端封装。该模块采用类封装模式，提供了统一的 API 接口、错误处理、拦截器配置等功能。

## 架构设计

### 双实例设计

- **NetMaster**: 处理业务 API 请求（JSON 数据）
- **NetMinIO**: 处理文件上传下载（二进制数据）

### 类封装模式

```typescript
class NetMaster {
  private readonly axiosInstance: AxiosInstance
  
  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance
    this.setupInterceptors()
  }
  
  // HTTP 方法封装
  public async get<T>(url: string, config?: any): Promise<AxiosResponse<ApiResponse<T>>>
  public async post<T>(url: string, data?: any, config?: any): Promise<AxiosResponse<ApiResponse<T>>>
  // ...
}
```

## 核心组件

### 1. 类型定义

#### ApiResponse 接口
```typescript
interface ApiResponse<T = unknown> {
  data: T           // 响应数据
  success: boolean  // 请求是否成功
  errCode: number   // 错误代码
  errMsg: string    // 错误消息
}
```

#### ApiError 类
```typescript
class ApiError extends Error {
  constructor(
    public errCode: number,
    public message: string,
    public response?: AxiosResponse
  )
}
```

### 2. 实例配置

#### Master 实例（业务 API）
```typescript
const masterInstance: AxiosInstance = axios.create({
  withCredentials: true,                    // 携带 Cookie
  baseURL: import.meta.env.VITE_REQUEST_URL, // 基础 URL
  timeout: 180 * 1000,                      // 3分钟超时
  headers: {
    'Content-Type': 'application/json'       // JSON 格式
  }
})
```

#### MinIO 实例（文件操作）
```typescript
const minioInstance: AxiosInstance = axios.create({
  timeout: 30 * 1000,                       // 30秒超时
  headers: {
    'Content-Type': 'application/octet-stream' // 二进制格式
  }
})
```

## 使用方法

### 1. 基本 HTTP 请求

#### GET 请求
```typescript
import { netMaster } from '@main/util/net-util'

// 简单 GET 请求
const response = await netMaster.get('/api/users')

// 带参数的 GET 请求
const response = await netMaster.get('/api/users', {
  params: { page: 1, limit: 10 }
})

// 带类型约束的 GET 请求
interface User {
  id: number
  name: string
  email: string
}
const response = await netMaster.get<User[]>('/api/users')
const users = response.data.data // 类型安全的访问
```

#### POST 请求
```typescript
// 创建用户
const userData = { name: 'John', email: 'john@example.com' }
const response = await netMaster.post('/api/users', userData)

// 带配置的 POST 请求
const response = await netMaster.post('/api/users', userData, {
  headers: { 'X-Custom-Header': 'value' }
})
```

#### PUT/PATCH/DELETE 请求
```typescript
// 更新用户
const response = await netMaster.put('/api/users/1', userData)

// 部分更新
const response = await netMaster.patch('/api/users/1', { name: 'Jane' })

// 删除用户
const response = await netMaster.delete('/api/users/1')
```

### 2. 文件操作

#### 文件上传
```typescript
import { netMinIO } from '@main/util/net-util'

// 上传图片
const imageFile = new File([...], 'image.jpg', { type: 'image/jpeg' })
const response = await netMinIO.uploadImage(presignedUrl, imageFile)

// 上传音频
const audioFile = new File([...], 'audio.mp3', { type: 'audio/mpeg' })
const response = await netMinIO.uploadAudio(presignedUrl, audioFile)

// 上传视频
const videoFile = new File([...], 'video.mp4', { type: 'video/mp4' })
const response = await netMinIO.uploadVideo(presignedUrl, videoFile)

// 通用文件上传
const file = new File([...], 'document.pdf', { type: 'application/pdf' })
const response = await netMinIO.uploadFile(presignedUrl, file)
```

#### 文件下载
```typescript
// 下载图片
const imageBlob = await netMinIO.downloadImage(imageUrl)

// 下载音频
const audioBlob = await netMinIO.downloadAudio(audioUrl)

// 下载视频
const videoBlob = await netMinIO.downloadVideo(videoUrl)

// 下载文件（自动触发浏览器下载）
await netMinIO.downloadFile(fileUrl, 'filename.pdf')

// 下载为 ArrayBuffer
const arrayBuffer = await netMinIO.downloadFileAsArrayBuffer(fileUrl)

// 下载为 Blob
const blob = await netMinIO.downloadFileAsBlob(fileUrl)

// 下载头像
const avatarBuffer = await netMinIO.downloadAvatar(avatarUrl)
```

#### JSON 数据下载
```typescript
// 下载 JSON 对象
const jsonData = await netMinIO.downloadJson(jsonUrl)

// 下载 JSON 字符串
const jsonString = await netMinIO.downloadJsonAsString(jsonUrl)
```

### 3. 错误处理

#### 捕获业务错误
```typescript
try {
  const response = await netMaster.get('/api/users')
  // 处理成功响应
} catch (error) {
  if (error instanceof ApiError) {
    console.error('业务错误:', error.errCode, error.message)
    // 根据错误代码处理
    switch (error.errCode) {
      case 401:
        // 未授权，跳转登录
        break
      case 403:
        // 权限不足
        break
      case 404:
        // 资源不存在
        break
      case 500:
        // 服务器错误
        break
    }
  } else {
    console.error('网络错误:', error)
  }
}
```

#### 文件操作错误处理
```typescript
try {
  await netMinIO.uploadImage(presignedUrl, imageFile)
} catch (error) {
  if (error instanceof ApiError) {
    console.error('文件上传失败:', error.message)
  } else {
    console.error('网络连接异常:', error)
  }
}
```

## 拦截器机制

### 请求拦截器

#### Master 实例请求拦截器
```typescript
this.axiosInstance.interceptors.request.use(
  (config) => {
    // 自动添加认证 Token
    const token: string = store.get(tokenKey)
    if (token && config.headers) {
      config.headers.token = token
    }
    return config
  },
  (error: AxiosError) => {
    Message.error('请求发送失败')
    return Promise.reject('请求发送失败')
  }
)
```

### 响应拦截器

#### Master 实例响应拦截器
```typescript
this.axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { errCode, errMsg, success } = response.data
    if (success) {
      return response
    } else {
      throw new ApiError(errCode, errMsg, response)
    }
  },
  (error: AxiosError) => {
    // 统一错误处理
    if (error.response) {
      const status = error.response.status
      switch (status) {
        case 401: Message.error('未授权，请重新登录'); break
        case 403: Message.error('权限不足'); break
        case 404: Message.error('请求的资源不存在'); break
        case 500: Message.error('服务器内部错误'); break
      }
      const errorData = error.response.data as any
      throw new ApiError(status, errorData?.errMsg || '请求失败', error.response)
    } else {
      throw new ApiError(-1, '网络连接异常')
    }
  }
)
```

## 最佳实践

### 1. 类型安全

#### 定义响应类型
```typescript
interface UserResponse {
  id: number
  name: string
  email: string
  createdAt: string
}

interface UserListResponse {
  users: UserResponse[]
  total: number
  page: number
}

// 使用类型约束
const response = await netMaster.get<UserListResponse>('/api/users')
const userList = response.data.data // 类型安全
```

#### 泛型约束
```typescript
// 为 API 方法添加泛型约束
public async get<T = any>(url: string, config?: any): Promise<AxiosResponse<ApiResponse<T>>>
public async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<ApiResponse<T>>>
```

### 2. 错误处理策略

#### 分层错误处理
```typescript
// 1. 网络层错误（AxiosError）
// 2. 业务层错误（ApiError）
// 3. 应用层错误处理

try {
  const response = await netMaster.get('/api/users')
  return response.data.data
} catch (error) {
  // 网络错误
  if (error instanceof AxiosError) {
    throw new Error('网络连接失败')
  }
  
  // 业务错误
  if (error instanceof ApiError) {
    throw new Error(`业务错误: ${error.message}`)
  }
  
  // 其他错误
  throw error
}
```

### 3. 请求配置优化

#### 超时配置
```typescript
// 业务请求：3分钟超时（适合复杂查询）
timeout: 180 * 1000

// 文件操作：30秒超时（适合文件传输）
timeout: 30 * 1000
```

#### 请求头配置
```typescript
// 业务请求：JSON 格式
headers: {
  'Content-Type': 'application/json'
}

// 文件请求：二进制格式
headers: {
  'Content-Type': 'application/octet-stream'
}
```

### 4. 文件操作最佳实践

#### 文件类型验证
```typescript
// 上传前验证文件类型
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
if (!allowedTypes.includes(file.type)) {
  throw new Error('不支持的文件类型')
}
```

#### 文件大小限制
```typescript
// 上传前检查文件大小
const maxSize = 10 * 1024 * 1024 // 10MB
if (file.size > maxSize) {
  throw new Error('文件大小超过限制')
}
```

#### 进度监控
```typescript
// 使用原生 axios 实例进行进度监控
const axiosInstance = netMinIO.getAxiosInstance()
const response = await axiosInstance.put(uploadUrl, file, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    console.log(`上传进度: ${percentCompleted}%`)
  }
})
```

### 5. 性能优化

#### 请求去重
```typescript
// 使用 Map 缓存进行中的请求
const pendingRequests = new Map<string, Promise<any>>()

async function requestWithDeduplication<T>(url: string, requestFn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)
  }
  
  const promise = requestFn()
  pendingRequests.set(url, promise)
  
  try {
    const result = await promise
    return result
  } finally {
    pendingRequests.delete(url)
  }
}
```

#### 批量请求
```typescript
// 使用 Promise.all 进行批量请求
const userIds = [1, 2, 3, 4, 5]
const userPromises = userIds.map(id => netMaster.get(`/api/users/${id}`))
const users = await Promise.all(userPromises)
```

### 6. 安全考虑

#### Token 管理
```typescript
// 自动添加认证 Token
const token: string = store.get(tokenKey)
if (token && config.headers) {
  config.headers.token = token
}
```

#### URL 验证
```typescript
// 上传前验证 URL 有效性
try {
  new URL(uploadUrl)
} catch {
  throw new Error(`无效的上传URL: ${uploadUrl}`)
}
```

#### 用户代理设置
```typescript
// 设置自定义 User-Agent
headers: {
  'User-Agent': 'TellYou-Client/1.0'
}
```

## 常见问题

### 1. 跨域问题
- 确保服务器配置了正确的 CORS 头
- 使用 `withCredentials: true` 携带 Cookie

### 2. 超时问题
- 业务请求：3分钟超时
- 文件操作：30秒超时
- 可根据实际需求调整

### 3. 文件上传失败
- 检查文件大小限制
- 验证文件类型
- 确认上传 URL 有效性

### 4. 认证失败
- 检查 Token 是否有效
- 确认 Token 存储位置
- 验证请求头格式

## 扩展建议

### 1. 添加重试机制
```typescript
public async requestWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error
      if (i === maxRetries) break
      
      // 指数退避
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  
  throw lastError
}
```

### 2. 添加请求缓存
```typescript
private cache = new Map<string, { data: any, timestamp: number }>()

public async getWithCache<T>(url: string, ttl: number = 300000): Promise<T> {
  const cached = this.cache.get(url)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  
  const response = await this.get<T>(url)
  this.cache.set(url, { data: response.data.data, timestamp: Date.now() })
  return response.data.data
}
```

### 3. 添加请求日志
```typescript
private logRequest(config: any, response?: any, error?: any) {
  const logData = {
    url: config.url,
    method: config.method,
    timestamp: new Date().toISOString(),
    response: response ? { status: response.status, data: response.data } : undefined,
    error: error ? { message: error.message, code: error.code } : undefined
  }
  
  console.log('Request Log:', JSON.stringify(logData, null, 2))
}
```

## 总结

`net-util.ts` 提供了完整的 HTTP 客户端解决方案，具有以下特点：

1. **类型安全**: 完整的 TypeScript 类型定义
2. **错误处理**: 统一的错误处理机制
3. **拦截器**: 自动化的请求/响应处理
4. **文件操作**: 专门的文件上传下载功能
5. **可扩展**: 易于扩展和定制

通过合理使用这些工具类，可以大大简化网络请求的开发工作，提高代码的可维护性和健壮性。
