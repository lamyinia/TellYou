import { store } from '../index'
import { BrowserWindow } from 'electron'
import axios from 'axios'
import { addLocalMessage } from '../sqlite/dao/message-dao'
import { updateSessionByMessage } from '../sqlite/dao/session-dao'
import { queryAll } from '../sqlite/sqlite-operation'

const mainAxios = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})
mainAxios.interceptors.request.use((config) => {
  const token = store.get('token')
  if (token) {
    config.headers.token = token
  }
  return config
})

export const pullOfflineMessages = async (): Promise<void> => {
  try {
    console.info('开始拉取用户离线消息...')

    const response = await mainAxios.get(
      `${import.meta.env.VITE_REQUEST_URL}/message/pullMailboxMessage`
    )

    if (!response.data.success) {
      console.error('拉取离线消息失败:', response.data.errMsg)
      return
    }

    const pullResult = response.data.data
    if (!pullResult || !pullResult.messageList || pullResult.messageList.length === 0) {
      console.info('没有离线消息需要拉取')
      return
    }

    console.info(`拉取到 ${pullResult.messageList.length} 条离线消息`)

    const messageIds: string[] = []
    const sessionUpdates = new Map<string, { content: string; sendTime: string }>()
    const chatMessages: unknown[] = []

    for (const message of pullResult.messageList) {
      const date = new Date(Number(message.adjustedTimestamp)).toISOString()
      console.log(message)
      const messageData = {
        sessionId: String(message.sessionId),
        sequenceId: message.sequenceNumber,
        senderId: String(message.senderId),
        messageId: message.messageId,
        senderName: '',
        msgType: message.messageType,
        text: message.content,
        extData: JSON.stringify(message.extra),
        sendTime: date,
        isRead: 0
      }
      const insertId = await addLocalMessage(messageData)
      messageIds.push(message.messageId)
      if (insertId <= 0) continue

      const sessionId = String(message.sessionId)
      const existingSession = sessionUpdates.get(sessionId)
      if (!existingSession || date > existingSession.sendTime) {
        sessionUpdates.set(sessionId, {
          content: message.content,
          sendTime: date
        })
      }

      chatMessages.push({
        id: insertId,
        sessionId: message.sessionId,
        content: message.content,
        messageType: 'text' as const,
        senderId: message.senderId,
        senderName: '',
        senderAvatar: '',
        timestamp: new Date(Number(message.adjustedTimestamp)),
        isRead: false
      })
    }
    const sessionUpdatePromises: unknown[] = []
    for (const [sessionId, updateData] of sessionUpdates) {
      sessionUpdatePromises.push(
        updateSessionByMessage({
          content: updateData.content,
          sendTime: updateData.sendTime,
          sessionId: sessionId
        })
      )
    }

    if (sessionUpdatePromises.length > 0) {
      try {
        await Promise.all(sessionUpdatePromises)
        console.info(`批量更新 ${sessionUpdatePromises.length} 个会话`)
      } catch (error) {
        console.error('批量更新会话失败:', error)
      }
    }


    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow && chatMessages.length > 0) {
      try {
        const sessionIds = Array.from(sessionUpdates.keys())
        const sessions = await queryAll(
          `SELECT *
           FROM sessions
           WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`,
          sessionIds
        )

        mainWindow.webContents.send('loadMessageDataCallback', chatMessages)
        mainWindow.webContents.send('loadSessionDataCallback', sessions)
        console.info(`发送 ${chatMessages.length} 条消息到渲染进程`)
      } catch (error) {
        console.error('发送消息到渲染进程失败:', error)
      }
    }

    if (messageIds.length > 0) {
      await ackConfirmMessages(messageIds)
    }
    if (pullResult.hasMore) {
      console.info('还有更多离线消息，继续拉取...')
      setTimeout(() => {
        pullOfflineMessages()
      }, 0)
    } else {
      console.info('离线消息拉取完成')
    }
  } catch (error) {
    console.error('拉取离线消息异常:', error)
  }
}

const ackConfirmMessages = async (messageIds: string[]): Promise<void> => {
  try {
    console.info(`确认 ${messageIds.length} 条消息`, messageIds)
    const requestData = {
      messageIdList: messageIds
    }
    const response = await mainAxios.post(
      `${import.meta.env.VITE_REQUEST_URL}/message/ackConfirm`,
      requestData
    )

    if (response.data.success) {
      console.info('消息确认成功')
    } else {
      console.error('消息确认失败:', response.data.errMsg)
    }
  } catch (error) {
    console.error('消息确认异常:', error)
  }
}
