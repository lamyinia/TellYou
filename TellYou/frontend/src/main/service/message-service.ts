/* eslint-disable */

import { ipcMain } from "electron";
import messageDao from "@main/sqlite/dao/message-dao";
import sessionDao from "@main/sqlite/dao/session-dao";
import messageAdapter from "@main/sqlite/adapter/message-adapter";
import channelUtil from "@main/util/channel-util";
import objectUtil from "@main/util/object-util";

class MessageService {
  public beginServe(): void {
    ipcMain.handle("websocket:send", async (_, msg) => {
      console.log(msg);
      try {
        await channelUtil.sendText(msg);
        console.log("发送成功");
        return true;
      } catch (error) {
        console.error("发送消息失败:", error);
        return false;
      }
    })
    ipcMain.handle(
      "message:get-by-sessionId",
      (_, sessionId: string | number, options: any) => {
        return messageDao.getMessageBySessionId(String(sessionId), options);
      },
    );
  }

  public async handleSingleMessage(message: any): Promise<number> {
    console.log("message-service:handle-single-message", message);
    const messageData = messageAdapter.adaptToDatabaseMessage(message);
    const msgId: number = await messageDao.addLocalMessage(messageData);

    await sessionDao.keepSessionFresh({
      content: objectUtil.getContentByRow(messageData),
      sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
      sessionId: message.sessionId
    })
    return msgId
  }

  public async getExtendData(params: { id: number }): Promise<any> {
    return messageDao.getExtendData(params);
  }

  /**
   * 处理上传确认消息，将上传中消息更新为正常消息
   */
  public async handleUploadConfirmation(localMessageId: number, wsMessage: any): Promise<void> {
    try {
      console.log(`开始处理上传确认: localMessageId=${localMessageId}`, wsMessage)
      
      // 更新消息数据
      await messageDao.updateMessageFromWebSocket(localMessageId, wsMessage)
      
      // 获取更新后的消息
      const updatedMessage = await messageDao.getById(localMessageId)
      if (!updatedMessage) {
        throw new Error(`更新后未找到消息: ${localMessageId}`)
      }
      
      // 转换为前端格式
      const vo = messageAdapter.adaptWebSocketMessage(wsMessage, localMessageId)
      
      // 更新会话最新消息
      await sessionDao.keepSessionFresh({
        content: objectUtil.getContentByRow(updatedMessage),
        sendTime: wsMessage.sendTime || new Date().toISOString(),
        sessionId: wsMessage.sessionId
      })
      
      // 通知渲染进程替换消息
      const { BrowserWindow } = require('electron')
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.send('message:replace', {
          sessionId: wsMessage.sessionId,
          messageId: localMessageId,
          newMessage: vo
        })
      }
      
      console.log(`上传确认处理完成: messageId=${localMessageId}`)
      
    } catch (error) {
      console.error(`处理上传确认失败: messageId=${localMessageId}`, error)
      throw error
    }
  }
}

export const messageService = new MessageService();
