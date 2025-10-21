import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { store } from '@main/index'
import { tokenKey } from '@main/electron-store/key'

type MessageType = 'error' | 'success' | 'warning'
type MessageCallback = (() => void) | undefined
const showMessage = (_msg: string, _callback: MessageCallback, _type: MessageType): void => {}
interface MessageMethods {
  error: (msg: string, callback?: () => void) => void
  success: (msg: string, callback?: () => void) => void
  warning: (msg: string, callback?: () => void) => void
}
const Message: MessageMethods = {
  error: (msg, callback) => showMessage(msg, callback, 'error'),
  success: (msg, callback) => showMessage(msg, callback, 'success'),
  warning: (msg, callback) => showMessage(msg, callback, 'warning')
}
interface ApiResponse<T = unknown> {
  data: T
  success: boolean
  errCode: number
  errMsg: string
}
class ApiError extends Error {
  public readonly errMsg: string
  constructor(public errCode: number, public message: string, public response?: AxiosResponse) {
    super(message)
    this.response = response
    this.errCode = errCode
    this.errMsg = message
    this.name = 'ApiError'
  }
}

const masterInstance: AxiosInstance = axios.create({
  withCredentials: true,
  baseURL: import.meta.env.VITE_REQUEST_URL,
  timeout: 180 * 1000,
  headers: {
    'Content-Type': 'application/json'
  }
})
const minioInstance: AxiosInstance = axios.create({
  timeout: 30 * 1000, // 文件上传下载超时时间更长
  headers: {
    'Content-Type': 'application/octet-stream'
  }
})

class NetMaster {
  private readonly axiosInstance: AxiosInstance

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance
    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token: string = store.get(tokenKey)
        if (token && config.headers) {
          config.headers.token = token
        }
        return config
      },
      (_error: AxiosError) => {
        Message.error('请求发送失败')
        return Promise.reject('请求发送失败')
      }
    )
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { errCode, errMsg, success } = response.data
        if (success) {
          return response
        } else {
          console.log('not-success: ', response)
          throw new ApiError(errCode, errMsg, response)
        }
      },
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status
          console.error('netMaster AxiosError:失败:', error.response)
          const data = error.response.data as Partial<ApiResponse> | undefined
          if (data && typeof data.errMsg === 'string') {
            throw new ApiError(data.errCode || -1, data.errMsg, error.response)
          }
          let msg = '请求失败'
          switch (status) {
            case 400:
              msg = '请求参数错误'
              break
            case 401:
              msg = '未授权，请重新登录'
              break
            case 403:
              msg = '权限不足'
              break
            case 404:
              msg = '请求的资源不存在'
              break
            case 500:
              msg = '服务器内部错误'
              break
          }
          Message.error(msg)
          throw new ApiError(status, msg, error.response)
        } else {
          throw new ApiError(-1, '网络连接异常')
        }
      }
    )
  }
  public async get<T = any>(url: string, config?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.get(url, config)
  }
  public async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.post(url, data, config)
  }
  public async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.put(url, data, config)
  }
  public async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.delete(url, config)
  }
  public async patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.axiosInstance.patch(url, data, config)
  }

  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}
minioInstance.interceptors.request.use(
  (config) => {
    return config
  },
  (_error: AxiosError) => {
    Message.error('文件请求发送失败')
    return Promise.reject('文件请求发送失败')
  }
)
minioInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    console.error(error)
    if (error.response) {
      const status = error.response.status
      console.log('netMinIO AxiosError', error)
      switch (status) {
        case 401:
          Message.error('文件访问未授权')
          break
        case 403:
          Message.error('文件访问权限不足')
          break
        case 404:
          Message.error('文件不存在')
          break
        case 500:
          Message.error('文件服务器错误')
          break
      }
      throw new ApiError(status, '文件操作失败', error.response)
    } else {
      throw new ApiError(-1, '文件网络连接异常')
    }
  }
)

class NetMinIO {
  private readonly axiosInstance: AxiosInstance

  constructor(axiosInstance: AxiosInstance) {
    this.axiosInstance = axiosInstance
  }

  public async simpleUploadFile(uploadUrl: string, fileBuffer: Buffer, mimeType: string): Promise<void> {
    console.info('上传URL，文件大小，MIME类型:', uploadUrl, fileBuffer.length, mimeType)
    try {
      new URL(uploadUrl)
    } catch {
      throw new Error(`无效的上传URL: ${uploadUrl}`)
    }
    try {
      const response = await netMinIO.getAxiosInstance().put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          Connection: 'close'
        }
      })
      console.log('上传响应:', response)
      if (response.status >= 200 && response.status < 300) {
        return
      } else {
        throw new Error(`上传失败，状态码: ${response.status}`)
      }
    } catch (error) {
      console.error('上传请求错误:', error)
      throw error
    }
  }

  async uploadImage(presignedUrl: string, imageFile: File): Promise<AxiosResponse> {
    const response = await this.axiosInstance.put(presignedUrl, imageFile, {
      headers: {
        'Content-Type': imageFile.type,
        'Content-Length': imageFile.size.toString()
      }
    })
    return response
  }
  async downloadImage(imageUrl: string): Promise<Blob> {
    const response = await this.axiosInstance.get(imageUrl, {
      responseType: 'blob',
      headers: {
        Accept: 'image/*'
      }
    })
    return response.data
  }
  async uploadAudio(presignedUrl: string, audioFile: File): Promise<AxiosResponse> {
    const response = await this.axiosInstance.put(presignedUrl, audioFile, {
      headers: {
        'Content-Type': audioFile.type,
        'Content-Length': audioFile.size.toString()
      }
    })
    return response
  }
  async downloadAudio(audioUrl: string): Promise<Blob> {
    const response = await this.axiosInstance.get(audioUrl, {
      responseType: 'blob',
      headers: {
        Accept: 'audio/*'
      }
    })
    return response.data
  }
  async uploadVideo(presignedUrl: string, videoFile: File): Promise<AxiosResponse> {
    const response = await this.axiosInstance.put(presignedUrl, videoFile, {
      headers: {
        'Content-Type': videoFile.type,
        'Content-Length': videoFile.size.toString()
      }
    })
    return response
  }
  async downloadVideo(videoUrl: string): Promise<Blob> {
    const response = await this.axiosInstance.get(videoUrl, {
      responseType: 'blob',
      headers: {
        Accept: 'video/*'
      }
    })
    return response.data
  }
  async uploadFile(presignedUrl: string, file: File): Promise<AxiosResponse> {
    const response = await this.axiosInstance.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': file.size.toString()
      }
    })
    return response
  }
  async downloadFile(fileUrl: string, filename?: string): Promise<Blob> {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: 'blob',
      headers: {
        Accept: '*/*'
      }
    })

    const blob = response.data
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'download'
    link.click()
    window.URL.revokeObjectURL(url)

    return blob
  }

  async downloadFileAsArrayBuffer(fileUrl: string, userAgent?: string): Promise<ArrayBuffer> {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: {
        Accept: '*/*',
        'User-Agent': userAgent || 'TellYou-Client/1.0'
      }
    })
    return response.data
  }

  async downloadFileAsBlob(fileUrl: string, userAgent?: string): Promise<Blob> {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: 'blob',
      headers: {
        Accept: '*/*',
        'User-Agent': userAgent || 'TellYou-Client/1.0'
      }
    })
    return response.data
  }

  async downloadAvatar(avatarUrl: string): Promise<ArrayBuffer> {
    return this.downloadFileAsArrayBuffer(avatarUrl, 'TellYou-Client/1.0')
  }

  async downloadJson(jsonUrl: string): Promise<any> {
    const response = await this.axiosInstance.get(jsonUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TellYou-Client/1.0'
      }
    })
    return response.data
  }


  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance
  }
}

const netMaster = new NetMaster(masterInstance)
const netMinIO = new NetMinIO(minioInstance)

export { netMaster, netMinIO }
export type { ApiResponse, ApiError }
