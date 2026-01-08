/* eslint-disable */

import { ipcMain } from "electron"
import messageDao from "@main/sqlite/dao/message-dao"
import sessionDao from "@main/sqlite/dao/session-dao"
import messageAdapter from "@main/sqlite/adapter/message-adapter"
import channelUtil from "@main/util/channel-util"
import objectUtil from "@main/util/object-util"

class MessageService {
  public beginServe(): void {
    ipcMain.handle("websocket:send", async (_, msg) => {
      console.log(msg)
      try {
        await channelUtil.sendText(msg)
        console.log("发送成功")
        return true
      } catch (error) {
        console.error("发送消息失败:", error)
        return false
      }
    })
    ipcMain.handle("message:get-by-sessionId",
      (_, sessionId: string | number, options: any) => {
        return messageDao.getMessageBySessionId(String(sessionId), options)
      })
  }

  public async handleSingleMessage(message: any): Promise<number> {
    console.log("message-service:handle-single-message", message)
    const messageData = messageAdapter.adaptToDatabaseMessage(message)
    const messageId: number = await messageDao.insertOrIgnore(messageData).then(result => result.lastInsertRowID || 0)

    await sessionDao.keepSessionFresh({
      content: objectUtil.getContentByRow(messageData),
      sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
      sessionId: message.sessionId
    })
    return messageId
  }
  /**
   * 处理上传确认消息，将上传中消息更新为正常消息
   */
  public async handleUploadConfirmation(localMessageId: number, wsMessage: any): Promise<void> {
    try {
      await messageDao.updateMessageFromWebSocket(localMessageId, wsMessage)
      const updatedMessage = await messageDao.getById(localMessageId)
      if (!updatedMessage) {
        throw new Error(`更新后未找到消息: ${localMessageId}`)
      }

      const vo = messageAdapter.adaptWebSocketMessage(wsMessage, localMessageId)
      await sessionDao.keepSessionFresh({
        content: objectUtil.getContentByRow(updatedMessage),
        sendTime: updatedMessage.sendTime || new Date().toISOString(),
        sessionId: wsMessage.sessionId
      })


      const { BrowserWindow } = require('electron')
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('message:replace', {
          sessionId: wsMessage.sessionId,
          messageId: localMessageId,
          newMessage: vo
        })
      }

      console.log(`MessageService 上传确认处理完成: messageId=${localMessageId}`)

    } catch (error) {
      console.error(`MessageService 处理上传确认失败: messageId=${localMessageId}`, error)
      throw error
    }
  }
}

export const messageService = new MessageService()
