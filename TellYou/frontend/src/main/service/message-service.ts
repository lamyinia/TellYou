import { ipcMain } from 'electron'
import { sendText } from '@main/websocket/client'
import messageDao from '@main/sqlite/dao/message-dao'

class MessageService {
  public beginServe(): void {
    ipcMain.handle('websocket:send', async (_, msg) => {
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
    ipcMain.handle('message:get-by-sessionId', (_, sessionId: string | number, options: any) => {
      return messageDao.getMessageBySessionId(String(sessionId), options)
    })
  }
}

export const messageService = new MessageService()
