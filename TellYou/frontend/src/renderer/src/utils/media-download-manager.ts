/*eslint-disable*/

import { ref, reactive } from "vue"

export type MediaType = "image" | "video" | "voice" | "file"
interface DownloadProgress {
  loaded: number
  total: number
  percentage: number
  speed?: number
  timeRemaining?: number
}
interface DownloadState {
  status: "idle" | "downloading" | "completed" | "error"
  progress?: DownloadProgress;
  error?: string
  localPath?: string
}

/**
 * 媒体文件下载管理器，主要职责请求主进程，获取本地多媒体(图片、视频、语音、文件)的本地地址。
 * 其实是有点写复杂了的，这个注册回调写起来就是 watch 的底层实现，直接用 watch 能少写很多代码。
 * 但是需求它是能满足的，不够简洁，但是属于能用。
 * @author lanye
 * @since 2025/10/26 03:39
 */

class MediaDownloadManager {
  // 存储每个消息的下载状态
  private downloadStates = reactive<Map<string, DownloadState>>(new Map())
  // 回调函数映射
  private callbacks = new Map<string, Array<(state: DownloadState) => void>>()
  constructor() {
    this.initializeListeners()
  }
  // 初始化IPC监听器
  private initializeListeners(): void {
    // 监听下载进度
    window.electronAPI.on("media:download:progress", (event: any, data: any) => {
      const key = `${data.messageId}-${data.type}-${data.mediaType}`
      const state: DownloadState = {
        status: "downloading",
        progress: {
          loaded: data.loaded,
            total: data.total,
            percentage: data.percentage,
            speed: data.speed,
            timeRemaining: data.timeRemaining,
          },
        }
      this.updateState(key, state)
    })
    // 监听下载失败
    window.electronAPI.on("media:download:error", (event: any, data: any) => {
      const key = `${data.messageId}-${data.type}-${data.mediaType}`
      const state: DownloadState = {
        status: "error",
        error: data.error,        
      }
      this.updateState(key, state)
    })
  }
  // 更新状态并触发回调
  private updateState(key: string, state: DownloadState): void {
    this.downloadStates.set(key, state)
    // 触发回调
    const callbacks = this.callbacks.get(key)
    if (callbacks) {
      callbacks.forEach((callback) => callback(state))
    }
  }
  // 获取下载状态
  getDownloadState(messageId: number, type: "original" | "thumbnail", mediaType: MediaType): DownloadState | null {
    const key = `${messageId}-${type}-${mediaType}`
    return this.downloadStates.get(key) || null
  }
  // 订阅下载状态变化
  subscribe(messageId: number, type: "original" | "thumbnail", mediaType: MediaType, callback: (state: DownloadState) => void): () => void {
    const key = `${messageId}-${type}-${mediaType}`
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, [])
    }
    this.callbacks.get(key)!.push(callback)
    // 如果已有状态，立即触发回调
    const currentState = this.downloadStates.get(key)
    if (currentState) {
      callback(currentState)
    }
    // 返回取消订阅函数
    return () => {
      const callbacks = this.callbacks.get(key)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.callbacks.delete(key)
          this.downloadStates.delete(key)
        }
      }
    }
  }
  // 请求媒体文件
  async requestMedia(messageId: number, type: "original" | "thumbnail", mediaType: MediaType): Promise<string | null> {
    try {
      const channel = `${mediaType}:cache:get:${type}`
      const result = await window.electronAPI.invoke(channel, {
        id: messageId,
      })
      const key = `${messageId}-${type}-${mediaType}`
      this.updateState(key, {
        status: "completed",
        localPath: result.localPath
      })
      console.log("request-media:签名地址", result)
      return result || null
    } catch (error) {
      console.error(`请求${mediaType}文件失败:`, error)
      return null
    }
  }
  // 创建响应式状态（用于组件）
  createReactiveState(messageId: number, type: "original" | "thumbnail", mediaType: MediaType): { state: any; unsubscribe: () => void } {
    const state = ref<DownloadState>({ status: "idle" })
    const unsubscribe = this.subscribe(messageId, type, mediaType, (newState) => {
      state.value = newState
    })
    return {
      state,
      unsubscribe
    }
  }
  // 清理指定消息的状态
  clearMessageStates(messageId: number): void {
    const keysToDelete = Array.from(this.downloadStates.keys()).filter((key) =>key.startsWith(`${messageId}-`))
    keysToDelete.forEach((key) => {
      this.downloadStates.delete(key)
      this.callbacks.delete(key)
    })
  }
}

export const mediaDownloadManager = new MediaDownloadManager()
export type { DownloadState, DownloadProgress }
export { MediaDownloadManager }
