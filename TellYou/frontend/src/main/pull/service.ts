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
    console.log(response)
    return
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
    for (const message of pullResult.messageList) {
      try {
        const insertId = await addLocalMessage({
          sessionId: String(message.sessionId),
          sequenceId: message.sequenceNumber || 0,
          senderId: String(message.senderId),
          messageId: message.messageId,
          senderName: '',
          msgType: message.messageType,
          text: message.content,
          extData: JSON.stringify(message.extra || {}),
          sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
          isRead: 0
        })

        if (insertId && insertId > 0) {
          await updateSessionByMessage({
            content: message.content,
            sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
            sessionId: String(message.sessionId)
          })

          messageIds.push(message.messageId)

          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow) {
            const chatMsg = {
              id: Number(insertId),
              sessionId: message.sessionId,
              content: message.content,
              messageType: 'text' as const,
              senderId: message.senderId,
              senderName: '',
              senderAvatar: '',
              timestamp: new Date(Number(message.adjustedTimestamp)),
              isRead: false
            }

            const sessions = await queryAll('select * from sessions where session_id = ?', [String(message.sessionId)]) as unknown[]
            if (sessions.length > 0) {
              mainWindow.webContents.send('loadMessageDataCallback', message.sessionId, chatMsg)
              mainWindow.webContents.send('loadSessionDataCallback', sessions)
            }
          }
        }
      } catch (error) {
        console.error(`处理消息 ${message.messageId} 失败:`, error)
      }
    }

    if (messageIds.length > 0) {
      await ackConfirmMessages(messageIds)
    }

    if (pullResult.hasMore) {
      console.info('还有更多离线消息，继续拉取...')
      setTimeout(() => {
        pullOfflineMessages()
      }, 1000)
    } else {
      console.info('离线消息拉取完成')
    }

  } catch (error) {
    console.error('拉取离线消息异常:', error)
  }
}

const ackConfirmMessages = async (messageIds: string[]): Promise<void> => {
  try {
    const token = store.get('token')
    if (!token) {
      console.warn('Token不存在，跳过消息确认')
      return
    }

    console.info(`确认 ${messageIds.length} 条消息`)

    // 使用POST请求确认消息
    const response = await mainAxios.post(
      `${import.meta.env.VITE_REQUEST_WS_URL?.replace('ws://', 'http://').replace('wss://', 'https://')}/message/ackConfirm`,
      {
        messageIdList: messageIds
      }
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
