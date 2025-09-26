import { ipcMain } from 'electron'
import { sendText } from '@main/websocket/client'
import { getMessageBySessionId } from '@main/sqlite/dao/message-dao'

class MessageService {
  public beginServe(): void {
    ipcMain.handle('ws-send', async (_, msg) => {
      console.log(msg)
      try {
        sendText(msg)
        console.log('发送成功')
        return true
      } catch (error) {
        console.error('发送消息失败:', error)
        return false
      }
    })
    ipcMain.handle('get-message-by-sessionId', (_, sessionId: string | number, options: any) => {
      return getMessageBySessionId(String(sessionId), options)
    })
  }
}

export const messageService = new MessageService()
