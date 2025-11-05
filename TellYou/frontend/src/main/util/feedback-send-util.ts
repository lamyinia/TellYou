/* eslint-disable */

import { BrowserWindow } from 'electron'

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
  type: FeedbackType
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}

/**
 * 主进程反馈发送工具类
 */
class FeedbackSendUtil {
  /**
   * 发送成功消息
   */
  success(
    webContents: Electron.WebContents | BrowserWindow,
    title: string,
    message?: string,
    duration?: number
  ): void {
    this.sendFeedback(webContents, {
      type: FeedbackType.SUCCESS,
      title,
      message,
      duration: duration ?? 3000
    })
  }

  /**
   * 发送错误消息
   */
  error(
    webContents: Electron.WebContents | BrowserWindow,
    title: string,
    message?: string,
    duration?: number
  ): void {
    this.sendFeedback(webContents, {
      type: FeedbackType.ERROR,
      title,
      message,
      duration: duration ?? 5000
    })
  }

  /**
   * 发送警告消息
   */
  warning(
    webContents: Electron.WebContents | BrowserWindow,
    title: string,
    message?: string,
    duration?: number
  ): void {
    this.sendFeedback(webContents, {
      type: FeedbackType.WARNING,
      title,
      message,
      duration: duration ?? 4000
    })
  }

  /**
   * 发送信息消息
   */
  info(
    webContents: Electron.WebContents | BrowserWindow,
    title: string,
    message?: string,
    duration?: number
  ): void {
    this.sendFeedback(webContents, {
      type: FeedbackType.INFO,
      title,
      message,
      duration: duration ?? 3000
    })
  }

  /**
   * 发送持久化消息（不会自动关闭）
   */
  persistent(
    webContents: Electron.WebContents | BrowserWindow,
    type: FeedbackType,
    title: string,
    message?: string
  ): void {
    this.sendFeedback(webContents, {
      type,
      title,
      message,
      persistent: true,
      duration: 0
    })
  }

  /**
   * 发送自定义反馈消息
   */
  custom(
    webContents: Electron.WebContents | BrowserWindow,
    feedbackMessage: FeedbackMessage
  ): void {
    this.sendFeedback(webContents, feedbackMessage)
  }

  /**
   * 核心发送方法
   */
  private sendFeedback(
    webContents: Electron.WebContents | BrowserWindow,
    feedbackMessage: FeedbackMessage
  ): void {
    try {
      // 获取实际的webContents对象
      const actualWebContents = this.getWebContents(webContents)
      
      if (!actualWebContents) {
        console.error('FeedbackSendUtil: 无效的webContents对象')
        return
      }

      // 检查webContents是否已销毁
      if (actualWebContents.isDestroyed()) {
        console.warn('FeedbackSendUtil: webContents已销毁，无法发送反馈')
        return
      }

      console.log(`FeedbackSendUtil: 发送${feedbackMessage.type}消息: ${feedbackMessage.title}`)

      // 发送IPC消息到渲染进程
      actualWebContents.send('feedback:receive', feedbackMessage)
    } catch (error) {
      console.error('FeedbackSendUtil: 发送反馈消息失败', error)
    }
  }

  /**
   * 获取webContents对象
   */
  private getWebContents(
    webContents: Electron.WebContents | BrowserWindow
  ): Electron.WebContents | null {
    try {
      if ('webContents' in webContents) {
        // 如果是BrowserWindow对象
        return webContents.webContents
      } else {
        // 如果是WebContents对象
        return webContents
      }
    } catch (error) {
      console.error('FeedbackSendUtil: 获取webContents失败', error)
      return null
    }
  }

  /**
   * 批量发送消息到所有窗口
   */
  broadcast(feedbackMessage: FeedbackMessage): void {
    try {
      const allWindows = BrowserWindow.getAllWindows()
      
      allWindows.forEach(window => {
        if (!window.isDestroyed()) {
          this.sendFeedback(window, feedbackMessage)
        }
      })

      console.log(`FeedbackSendUtil: 广播${feedbackMessage.type}消息到${allWindows.length}个窗口`)
    } catch (error) {
      console.error('FeedbackSendUtil: 广播消息失败', error)
    }
  }

  /**
   * 广播成功消息到所有窗口
   */
  broadcastSuccess(title: string, message?: string, duration?: number): void {
    this.broadcast({
      type: FeedbackType.SUCCESS,
      title,
      message,
      duration: duration ?? 3000
    })
  }

  /**
   * 广播错误消息到所有窗口
   */
  broadcastError(title: string, message?: string, duration?: number): void {
    this.broadcast({
      type: FeedbackType.ERROR,
      title,
      message,
      duration: duration ?? 5000
    })
  }

  /**
   * 广播警告消息到所有窗口
   */
  broadcastWarning(title: string, message?: string, duration?: number): void {
    this.broadcast({
      type: FeedbackType.WARNING,
      title,
      message,
      duration: duration ?? 4000
    })
  }

  /**
   * 广播信息消息到所有窗口
   */
  broadcastInfo(title: string, message?: string, duration?: number): void {
    this.broadcast({
      type: FeedbackType.INFO,
      title,
      message,
      duration: duration ?? 3000
    })
  }
}

// 创建全局单例
const feedbackSendUtil = new FeedbackSendUtil()

export default feedbackSendUtil