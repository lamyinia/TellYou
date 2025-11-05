/* eslint-disable */

import { reactive } from 'vue'

export interface UploadInfo {
  messageId: number
  sessionId: string
  mediaType: string
  progress: number
  status: 'uploading' | 'failed' | 'success'
  error?: string
  filePath?: string
  startTime: number
}

class MediaUploadManager {
  public uploadingMessages = reactive(new Map<number, UploadInfo>())
  private isInitialized = false

  constructor() {
    console.log('MediaUploadManager 构造函数被调用')
    this.initialize()
  }

  /**
   * 初始化IPC监听器
   */
  private initialize(): void {
    if (this.isInitialized) return

    console.log('开始初始化MediaUploadManager IPC监听器')
    console.log('window.electronAPI 是否可用:', !!window.electronAPI)

    if (!window.electronAPI) {
      console.error('window.electronAPI 不可用，无法初始化上传监听器')
      return
    }

    window.electronAPI.on('media:upload:started', (...args: unknown[]) => {
      console.log('MediaUploadManager 监听上传开始事件', args)
      const data = args[1] as { messageId: number, sessionId: string, mediaType: string, filePath: string }
      console.log('MediaUploadManager 解析的上传数据:', data)

      this.startUpload(data.messageId, {
        messageId: data.messageId,
        sessionId: data.sessionId,
        mediaType: data.mediaType,
        filePath: data.filePath
      })
    })
    window.electronAPI.on('media:upload:progress', (...args: unknown[]) => {
      console.log('MediaUploadManager 监听上传进度更新', args)
      const data = args[1] as { messageId: number, progress: number }
      this.updateProgress(data.messageId, data.progress)
    })

    window.electronAPI.on('media:upload:failed', (...args: unknown[]) => {
      console.log('MediaUploadManager 监听上传失败', args)
      const data = args[1] as { messageId: number, error: string }
      this.markFailed(data.messageId, data.error)
    })

    window.electronAPI.on('message:upload:confirmed', (...args: unknown[]) => {
      console.log('MediaUploadManager 监听WebSocket消息确认（上传完成的最终确认）', args)
      const data = args[1] as { messageId: number }
      setTimeout(() => {
        this.uploadingMessages.delete(data.messageId)
        console.log('MediaUploadManager 上传完成，已从响应式Map中移除:', data.messageId)
      }, 500)
    })

    this.isInitialized = true
    console.log('MediaUploadManager initialized - 所有事件监听器已注册')

    // 测试响应式Map是否正常工作
    setTimeout(() => {
      console.log('MediaUploadManager 初始化完成，当前状态:', {
        isInitialized: this.isInitialized,
        uploadingCount: this.uploadingMessages.size
      })
    }, 1000)
  }

  /**
   * 开始上传
   */
  public startUpload(messageId: number, info: Omit<UploadInfo, 'progress' | 'status' | 'startTime'>): void {
    const uploadInfo: UploadInfo = {
      ...info,
      progress: 0,
      status: 'uploading',
      startTime: Date.now()
    }

    this.uploadingMessages.set(messageId, uploadInfo)
    console.log('MediaUploadManager 上传信息已存储到响应式Map:', messageId, this.uploadingMessages.has(messageId))
    console.log('MediaUploadManager 当前上传中的消息数量:', this.uploadingMessages.size)
    console.log('MediaUploadManager 开始上传:', messageId, uploadInfo)
  }

  /**
   * 更新上传进度
   */
  public updateProgress(messageId: number, progress: number): void {
    console.log('MediaUploadManager 收到进度更新请求:', messageId, progress + '%')
    const uploadInfo = this.uploadingMessages.get(messageId)
    console.log('MediaUploadManager 找到上传信息:', !!uploadInfo)

    if (uploadInfo) {
      const oldProgress = uploadInfo.progress
      uploadInfo.progress = Math.max(0, Math.min(100, progress))
      console.log('MediaUploadManager 进度变化:', oldProgress + '% -> ' + uploadInfo.progress + '%')
      console.log('MediaUploadManager 上传进度更新:', messageId, progress + '%')
    } else {
      console.error('MediaUploadManager 未找到messageId对应的上传信息:', messageId)
      console.log('MediaUploadManager 当前上传中的消息:', Array.from(this.uploadingMessages.keys()))
    }
  }

  /**
   * 标记上传失败
   */
  public markFailed(messageId: number, error: string): void {
    const uploadInfo = this.uploadingMessages.get(messageId)
    if (uploadInfo) {
      uploadInfo.status = 'failed'
      uploadInfo.error = error
      console.error('MediaUploadManager 上传失败:', messageId, error)
    }
  }

  /**
   * 标记上传成功并移除追踪
   */
  public markSuccess(messageId: number): void {
    const uploadInfo = this.uploadingMessages.get(messageId)
    if (uploadInfo) {
      uploadInfo.status = 'success'
      uploadInfo.progress = 100
      console.log('MediaUploadManager 上传成功:', messageId)

      // 延迟删除，让组件有时间显示成功状态
      setTimeout(() => {
        this.uploadingMessages.delete(messageId)
        console.log('MediaUploadManager 成功状态显示完毕，已从响应式Map中移除:', messageId)
      }, 1000)
    }
  }

  /**
   * 获取上传信息
   */
  public getUploadInfo(messageId: number): UploadInfo | null {
    return this.uploadingMessages.get(messageId) || null
  }

  /**
   * 获取所有正在上传的消息
   */
  public getAllUploading(): UploadInfo[] {
    return Array.from(this.uploadingMessages.values())
  }

  /**
   * 取消上传
   */
  public cancelUpload(messageId: number): void {
    const uploadInfo = this.uploadingMessages.get(messageId)
    if (uploadInfo) {
      this.uploadingMessages.delete(messageId)
      console.log('MediaUploadManager 取消上传:', messageId)
    }
  }

  /**
   * 重试上传
   */
  public retryUpload(messageId: number): void {
    const uploadInfo = this.uploadingMessages.get(messageId)
    if (uploadInfo && uploadInfo.status === 'failed') {
      uploadInfo.status = 'uploading'
      uploadInfo.progress = 0
      uploadInfo.error = undefined
      uploadInfo.startTime = Date.now()

      window.electronAPI.send('media:retry:upload', { messageId })
      console.log('MediaUploadManager 重试上传:', messageId)
    }
  }


  /**
   * 清理过期的上传记录（超过1小时的失败记录）
   */
  public cleanup(): void {
    const now = Date.now()
    const expireTime = 60 * 60 * 1000 // 1小时

    for (const [messageId, info] of this.uploadingMessages.entries()) {
      if (info.status === 'failed' && (now - info.startTime) > expireTime) {
        this.uploadingMessages.delete(messageId)
        console.log('MediaUploadManager 清理过期上传记录:', messageId)
      }
    }
  }

  /**
   * 获取上传统计信息
   */
  public getStats(): { uploading: number, failed: number, total: number } {
    let uploading = 0
    let failed = 0

    for (const info of this.uploadingMessages.values()) {
      if (info.status === 'uploading') {
        uploading++
      } else if (info.status === 'failed') {
        failed++
      }
    }

    return {
      uploading,
      failed,
      total: this.uploadingMessages.size
    }
  }

  /**
   * 销毁管理器，清理所有数据
   */
  public destroy(): void {
    if (!this.isInitialized) return

    // 清理所有数据
    this.uploadingMessages.clear()
    this.isInitialized = false

    console.log('MediaUploadManager destroyed')
  }
}

export const mediaUploadManager = new MediaUploadManager()

setInterval(() => {
  mediaUploadManager.cleanup()
}, 10 * 60 * 1000) // 每10分钟清理一次

export default mediaUploadManager
