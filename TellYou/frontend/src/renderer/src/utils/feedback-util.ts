/* eslint-disable */

import { ref } from "vue"

/**
 * 反馈消息类型枚举
 */
export enum FeedbackType {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * 反馈消息接口
 */
export interface FeedbackMessage {
  id: string
  type: FeedbackType
  title: string
  message?: string
  duration?: number // 自动关闭时间(ms)，0表示不自动关闭
  persistent?: boolean // 是否持久显示
  timestamp: number // 创建时间戳
}

/**
 * 反馈配置接口
 */
interface FeedbackConfig {
  maxMessages: number // 最大消息数量
  defaultDuration: {
    [FeedbackType.SUCCESS]: number
    [FeedbackType.ERROR]: number
    [FeedbackType.WARNING]: number
    [FeedbackType.INFO]: number
  }
  preventDuplicateInterval: number // 防重复消息间隔(ms)
}

/**
 * 全局反馈管理工具类
 */
class FeedbackUtil {
  private messages = ref<FeedbackMessage[]>([])
  private timers = new Map<string, NodeJS.Timeout>()
  private recentMessages = new Map<string, number>() // 记录最近消息，防重复

  private config: FeedbackConfig = {
    maxMessages: 5,
    defaultDuration: {
      [FeedbackType.SUCCESS]: 3000,
      [FeedbackType.ERROR]: 5000,
      [FeedbackType.WARNING]: 4000,
      [FeedbackType.INFO]: 3000,
    },
    preventDuplicateInterval: 2000,
  }

  /**
   * 获取所有消息（响应式）
   */
  get allMessages() {
    return this.messages
  }

  /**
   * 显示成功消息
   */
  success(title: string, message?: string, duration?: number): string {
    return this.addMessage({
      type: FeedbackType.SUCCESS,
      title,
      message,
      duration: duration ?? this.config.defaultDuration[FeedbackType.SUCCESS],
    })
  }

  /**
   * 显示错误消息
   */
  error(title: string, message?: string, duration?: number): string {
    return this.addMessage({
      type: FeedbackType.ERROR,
      title,
      message,
      duration: duration ?? this.config.defaultDuration[FeedbackType.ERROR],
    })
  }

  /**
   * 显示警告消息
   */
  warning(title: string, message?: string, duration?: number): string {
    return this.addMessage({
      type: FeedbackType.WARNING,
      title,
      message,
      duration: duration ?? this.config.defaultDuration[FeedbackType.WARNING],
    })
  }

  /**
   * 显示信息消息
   */
  info(title: string, message?: string, duration?: number): string {
    return this.addMessage({
      type: FeedbackType.INFO,
      title,
      message,
      duration: duration ?? this.config.defaultDuration[FeedbackType.INFO],
    })
  }

  /**
   * 添加消息（内部方法）
   */
  private addMessage(options: {
    type: FeedbackType;
    title: string;
    message?: string;
    duration?: number;
    persistent?: boolean;
  }): string {
    const { type, title, message, duration = 0, persistent = false } = options

    // 生成消息唯一ID
    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 生成消息内容的哈希，用于防重复
    const contentHash = `${type}_${title}_${message || ""}`

    // 检查是否为重复消息
    if (this.isDuplicateMessage(contentHash)) {
      console.log("防重复消息：", title)
      return id // 返回ID但不显示消息
    }

    // 记录消息，用于防重复
    this.recentMessages.set(contentHash, Date.now())

    const feedbackMessage: FeedbackMessage = {
      id,
      type,
      title,
      message,
      duration,
      persistent,
      timestamp: Date.now(),
    }

    // 添加到消息列表
    this.messages.value.push(feedbackMessage)

    // 限制消息数量
    this.limitMessages()

    // 设置自动关闭
    if (duration > 0 && !persistent) {
      this.setAutoClose(id, duration)
    }

    return id
  }

  /**
   * 检查是否为重复消息
   */
  private isDuplicateMessage(contentHash: string): boolean {
    const lastTime = this.recentMessages.get(contentHash)
    if (!lastTime) return false

    const now = Date.now()
    return now - lastTime < this.config.preventDuplicateInterval
  }

  /**
   * 设置自动关闭
   */
  private setAutoClose(id: string, duration: number): void {
    const timer = setTimeout(() => {
      this.remove(id)
    }, duration)

    this.timers.set(id, timer)
  }

  /**
   * 移除指定消息
   */
  remove(id: string): void {
    // 清除定时器
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    // 从消息列表中移除
    const index = this.messages.value.findIndex((msg) => msg.id === id)
    if (index > -1) {
      this.messages.value.splice(index, 1)
    }
  }

  /**
   * 清空所有消息
   */
  clear(): void {
    // 清除所有定时器
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers.clear()

    // 清空消息列表
    this.messages.value = []

    // 清空重复消息记录
    this.recentMessages.clear()
  }

  /**
   * 限制消息数量
   */
  private limitMessages(): void {
    while (this.messages.value.length > this.config.maxMessages) {
      const oldestMessage = this.messages.value[0]
      this.remove(oldestMessage.id)
    }
  }

  /**
   * 清理过期的重复消息记录
   */
  private cleanupRecentMessages(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.recentMessages.forEach((timestamp, key) => {
      if (now - timestamp > this.config.preventDuplicateInterval) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach((key) => {
      this.recentMessages.delete(key)
    })
  }

  /**
   * 销毁实例，清理所有资源
   */
  destroy(): void {
    this.clear()
  }
}

// 创建全局单例实例
const feedbackUtil = new FeedbackUtil()

// 定期清理过期的重复消息记录
setInterval(() => {
  (feedbackUtil as any).cleanupRecentMessages()
}, 30000) // 每30秒清理一次

export default feedbackUtil