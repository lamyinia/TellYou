/* eslint-disable */

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
  private uploadingMessages = new Map<number, UploadInfo>()
  private listeners = new Set<(messageId: number, info: UploadInfo | null) => void>()
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  /**
   * 初始化IPC监听器
   */
  private initialize(): void {
    if (this.isInitialized) return
    
    // 监听上传开始事件
    window.electronAPI.on('media:upload:started', (...args: unknown[]) => {
      const data = args[0] as { messageId: number, sessionId: string, mediaType: string, filePath: string }
      this.startUpload(data.messageId, {
        messageId: data.messageId,
        sessionId: data.sessionId,
        mediaType: data.mediaType,
        filePath: data.filePath
      })
    })

    // 监听上传进度更新
    window.electronAPI.on('media:upload:progress', (...args: unknown[]) => {
      const data = args[0] as { messageId: number, progress: number }
      this.updateProgress(data.messageId, data.progress)
    })

    // 监听上传成功
    window.electronAPI.on('media:upload:success', (...args: unknown[]) => {
      const data = args[0] as { messageId: number }
      this.markSuccess(data.messageId)
    })

    // 监听上传失败
    window.electronAPI.on('media:upload:failed', (...args: unknown[]) => {
      const data = args[0] as { messageId: number, error: string }
      this.markFailed(data.messageId, data.error)
    })

    // 监听WebSocket消息确认（上传完成的最终确认）
    window.electronAPI.on('message:upload:confirmed', (...args: unknown[]) => {
      const data = args[0] as { messageId: number }
      // WebSocket确认后，标记为最终成功
      setTimeout(() => {
        this.uploadingMessages.delete(data.messageId)
        this.notifyListeners(data.messageId, null)
      }, 500) // 给UI一点时间显示成功状态
    })

    this.isInitialized = true
    console.log('MediaUploadManager initialized')
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
    this.notifyListeners(messageId, uploadInfo)
    
    console.log('开始上传:', messageId, uploadInfo)
  }

  /**
   * 更新上传进度
   */
  public updateProgress(messageId: number, progress: number): void {
    const uploadInfo = this.uploadingMessages.get(messageId)
    if (uploadInfo) {
      uploadInfo.progress = Math.max(0, Math.min(100, progress))
      this.notifyListeners(messageId, uploadInfo)
      
      console.log('上传进度更新:', messageId, progress + '%')
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
      this.notifyListeners(messageId, uploadInfo)
      
      console.error('上传失败:', messageId, error)
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
      this.notifyListeners(messageId, uploadInfo)
      
      // 延迟移除，给UI一点时间显示成功状态
      setTimeout(() => {
        this.uploadingMessages.delete(messageId)
        this.notifyListeners(messageId, null)
      }, 1000)
      
      console.log('上传成功:', messageId)
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
      this.notifyListeners(messageId, null)
      
      console.log('取消上传:', messageId)
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
      
      this.notifyListeners(messageId, uploadInfo)
      
      // 通知主进程重新开始上传
      window.electronAPI.send('media:retry:upload', { messageId })
      
      console.log('重试上传:', messageId)
    }
  }

  /**
   * 添加状态变化监听器
   */
  public addListener(listener: (messageId: number, info: UploadInfo | null) => void): void {
    this.listeners.add(listener)
  }

  /**
   * 移除状态变化监听器
   */
  public removeListener(listener: (messageId: number, info: UploadInfo | null) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(messageId: number, info: UploadInfo | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(messageId, info)
      } catch (error) {
        console.error('上传状态监听器执行失败:', error)
      }
    })
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
        this.notifyListeners(messageId, null)
        console.log('清理过期上传记录:', messageId)
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
    this.listeners.clear()
    this.isInitialized = false

    console.log('MediaUploadManager destroyed')
  }
}

// 创建全局单例
export const mediaUploadManager = new MediaUploadManager()

// 定期清理过期记录
setInterval(() => {
  mediaUploadManager.cleanup()
}, 10 * 60 * 1000) // 每10分钟清理一次

export default mediaUploadManager