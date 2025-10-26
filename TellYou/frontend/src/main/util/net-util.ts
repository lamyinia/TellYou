import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { store } from '@main/index'
import { tokenKey, uidKey } from '@main/electron-store/key'
import { Api } from '@main/service/proxy-service'
import urlUtil from '@main/util/url-util'

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
  // 不设置默认 Content-Type，让每个请求自己指定
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

  public async getUserAvatarUploadUrl(fileSize: number, fileSuffix: string): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> {
    const response = await this.get(Api.GET_AVATAR_UPLOAD_URL, { params: { fileSize, fileSuffix } })
    return response.data.data
  }

  public async confirmUserAvatarUploaded(uploadUrls: any): Promise<any> {
    return this.post(Api.CONFIRM_UPLOAD, {
      fromUserId: store.get(uidKey),
      originalUploadUrl: urlUtil.extractObjectName(uploadUrls.originalUploadUrl),
      thumbnailUploadUrl: urlUtil.extractObjectName(uploadUrls.thumbnailUploadUrl)
    })
  }
  // 图片上传预签名URL获取
  public async getPictureUploadUrl(params: {fileSize: number, fileSuffix: string, messageId?: string}): Promise<{ originalUploadUrl: string; thumbnailUploadUrl: string }> {
    const response = await this.get(Api.GET_PICTURE_UPLOAD_URL, { params })
    return response.data.data
  }
  // 语音上传预签名URL获取
  public async getVoiceUploadUrl(params: {fileSize: number, fileSuffix: string, duration: number, messageId?: string}): Promise<{ uploadUrl: string }> {
    const response = await this.get(Api.GET_VOICE_UPLOAD_URL, { params })
    return response.data.data
  }

  // 视频上传预签名URL获取
  public async getVideoUploadUrl(params: {fileSize: number, fileSuffix: string, videoDuration: number, messageId?: string}): Promise<{ originalUploadUrl: string; previewUploadUrl: string }> {
    const response = await this.get(Api.GET_VIDEO_UPLOAD_URL, { params })
    return response.data.data
  }

  // 文件上传预签名URL获取
  public async getFileUploadUrl(params: {fileSize: number, fileSuffix: string, fileName: string, messageId?: string}): Promise<{ uploadUrl: string }> {
    const response = await this.get(Api.GET_FILE_UPLOAD_URL, { params })
    return response.data.data
  }

  // 图片上传确认
  public async confirmPictureUploaded(params: {uploadUrls: any, targetId: number, contactType: number, sessionId: number, messageId?: string}): Promise<any> {
    try {
      const response = await this.post(Api.CONFIRM_PICTURE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        originalUploadUrl: urlUtil.extractObjectName(params.uploadUrls.originalUploadUrl),
        thumbnailUploadUrl: urlUtil.extractObjectName(params.uploadUrls.thumbnailUploadUrl),
        messageId: params.messageId
      })
      return response.data
    } catch (e: any) {
      return this.errorResponse(e)
    }
  }

  // 语音上传确认
  public async confirmVoiceUploaded(params: {uploadUrls: any, targetId: number, contactType: number, sessionId: number, duration: number, messageId?: string}): Promise<any> {
    try {
      const response = await this.post(Api.CONFIRM_VOICE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(params.uploadUrls.uploadUrl),
        duration: params.duration,
        messageId: params.messageId
      })
      return response.data
    } catch (e: any) {
      return this.errorResponse(e)
    }
  }

  // 视频上传确认
  public async confirmVideoUploaded(params: {uploadUrls: any, targetId: number, contactType: number, sessionId: number, videoDuration: number, fileSize: number, messageId?: string}): Promise<any> {
    try {
      const response = await this.post(Api.CONFIRM_VIDEO_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(params.uploadUrls.originalUploadUrl),
        thumbnailObject: urlUtil.extractObjectName(params.uploadUrls.previewUploadUrl),
        videoDuration: params.videoDuration,
        fileSize: params.fileSize,
        messageId: params.messageId
      })
      return response.data
    } catch (e: any) {
      return this.errorResponse(e)
    }
  }

  // 文件上传确认
  public async confirmFileUploaded(params: {uploadUrls: any,targetId: number,contactType: number,sessionId: number,fileName: string,fileSize: number, messageId?: string}): Promise<any> {
    try {
      const response = await this.post(Api.CONFIRM_FILE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(params.uploadUrls.uploadUrl),
        fileName: params.fileName,
        fileSize: params.fileSize,
        messageId: params.messageId
      })
      return response.data
    } catch (e: any) {
      return this.errorResponse(e)
    }
  }

  public errorResponse(e: any): any {
    if (e?.name === 'ApiError') {
      return { success: false, errCode: e.errCode ?? -1, errMsg: e.errMsg ?? '请求失败' }
    }
    return { success: false, errCode: -1, errMsg: e?.message || '网络或系统异常' }
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

// 进度回调接口
interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  timeRemaining?: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

interface DownloadOptions {
  onProgress?: ProgressCallback;
  chunkSize?: number;
  maxConcurrent?: number;
  timeout?: number;
}

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

  // 图片专用进度下载
  async downloadImageWithProgress(imageUrl: string, options: DownloadOptions = {}): Promise<ArrayBuffer> {
    console.log('开始下载图片:', imageUrl)
    const startTime = Date.now()

    const response = await this.axiosInstance.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 30000,
      headers: {
        'Accept': 'image/*'
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded
          const total = progressEvent.total
          const percentage = Math.round((loaded / total) * 100)
          // 计算下载速度
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? loaded / elapsed : 0
          // 预估剩余时间
          const remaining = total - loaded
          const timeRemaining = speed > 0 ? remaining / speed : 0
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          })
        }
      }
    })

    console.log('下载响应类型:', typeof response.data, response.data?.constructor?.name)
    return response.data  // 直接返回 ArrayBuffer
  }
  // 音频专用进度下载
  async downloadAudioWithProgress(audioUrl: string, options: DownloadOptions = {}): Promise<ArrayBuffer> {
    console.log('开始下载音频:', audioUrl)
    const startTime = Date.now()

    const response = await this.axiosInstance.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 30000,
      headers: {
        'Accept': 'audio/*'
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded
          const total = progressEvent.total
          const percentage = Math.round((loaded / total) * 100)
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? loaded / elapsed : 0
          const remaining = total - loaded
          const timeRemaining = speed > 0 ? remaining / speed : 0
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          })
        }
      }
    })

    console.log('音频下载响应类型:', typeof response.data, response.data?.constructor?.name)
    return response.data
  }
  // 视频专用进度下载
  async downloadVideoWithProgress(videoUrl: string, options: DownloadOptions = {}): Promise<ArrayBuffer> {
    console.log('开始下载视频:', videoUrl)
    const startTime = Date.now()

    const response = await this.axiosInstance.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 60000,
      headers: {
        'Accept': 'video/*'
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded
          const total = progressEvent.total
          const percentage = Math.round((loaded / total) * 100)
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? loaded / elapsed : 0
          const remaining = total - loaded
          const timeRemaining = speed > 0 ? remaining / speed : 0
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          })
        }
      }
    })

    console.log('视频下载响应类型:', typeof response.data, response.data?.constructor?.name)
    return response.data
  }
  // 文件专用进度下载
  async downloadFileWithProgress(fileUrl: string, options: DownloadOptions = {}): Promise<ArrayBuffer> {
    console.log('开始下载文件:', fileUrl)
    const startTime = Date.now()

    const response = await this.axiosInstance.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 60000,
      headers: {
        'Accept': '*/*'
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded
          const total = progressEvent.total
          const percentage = Math.round((loaded / total) * 100)
          const elapsed = (Date.now() - startTime) / 1000
          const speed = elapsed > 0 ? loaded / elapsed : 0
          const remaining = total - loaded
          const timeRemaining = speed > 0 ? remaining / speed : 0
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          })
        }
      }
    })
    
    // 调试响应头信息
    console.log('📋 下载响应头信息:', {
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      allHeaders: response.headers
    })
    console.log('文件下载响应类型:', typeof response.data, response.data?.constructor?.name)
    
    return response.data
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
export type { ApiResponse, ApiError, DownloadProgress, ProgressCallback, DownloadOptions }
