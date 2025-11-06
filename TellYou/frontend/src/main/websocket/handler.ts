/* eslint-disable */

import { BrowserWindow } from "electron"
import { Session } from "@shared/types/session"
import { messageService } from "@main/service/message-service"
import messageAdapter from "@main/sqlite/adapter/message-adapter"
import sessionDao from "@main/sqlite/dao/session-dao"
import channelUtil from "@main/util/channel-util"
import { applicationService } from "@main/service/application-service"
import { sessionService } from "@main/service/session-service"
import messageDao from "@main/sqlite/dao/message-dao"
import { store } from "@main/index"
import { uidKey } from "@main/electron-store/key"
import urlUtil from "@main/util/url-util"
import log from 'electron-log'

/**
 * 职责：处理从 websocket-channel 推送过来的消息
 * @author lanye
 * @since 2025/10/28 00:47
 */

class WebsocketHandler {
  // 聊天消息
  public async handleChatMessage(msg: any): Promise<void> {
    console.log("handleMessage", msg)

    // 检查是否是上传完成的回填消息
    const isUploadConfirmation = await this.checkAndHandleUploadConfirmation(msg)
    if (isUploadConfirmation < 0) return

    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (isUploadConfirmation === 0) {
      const insertId = await messageService.handleSingleMessage(msg)
      if (!insertId || insertId <= 0) return
      const vo = messageAdapter.adaptWebSocketMessage(msg, insertId)
      mainWindow.webContents.send("message:call-back:load-data", [vo])
    }

    channelUtil.sendSingleChatAckConfirm(msg)
    const session: Session = await sessionDao.selectSingleSession(msg.sessionId)
    mainWindow.webContents.send("session:call-back:load-data", [session])
  }

  // 申请通知
  public async handleApplication(msg: any): Promise<void> {
    delete msg.receiverId
    await applicationService.handleSingleApplication(msg)
    channelUtil.sendSingleApplicationAckConfirm(msg)

    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow.webContents.send("income-list:call-back:load-data", "ping")
    mainWindow.webContents.send("out-send-list:call-back:load-data", "ping")
  }

  // 填充会话信息，发送 ack 确认，发送渲染进程响应    (单聊、多聊创建，单聊、多聊解散)[往往伴随着会话变更]
  public async handleSession(msg: any): Promise<void> {
    console.info("handle-session:", msg)
    const type = msg.metaSessionType <= 2 ? 1 : 2
    Object.assign(msg, { contactType: type })
    if (msg.metaSessionType === 2 || msg.metaSessionType === 4) {
      await sessionService.deprecateSession(msg.sessionId)
    } else {
      await sessionService.fillSession([msg]) // 先填充会话信息，ContactList 只会收集需要的字段
    }
    channelUtil.sendSingleSessionAckConfirm(msg)
    const session = await sessionService.selectSingleSessionById(msg.sessionId)
    log.info("handle-session:select", session)
    if (session) {
      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow.webContents.send("session:call-back:load-data", [session])
    }
  }

  /**
   * 检查并处理上传确认消息
   */
  private async checkAndHandleUploadConfirmation(msg: any): Promise<number> {
    try {
      const fromUserId = store.get(uidKey) as string

      if (msg.senderId !== fromUserId) {
        return 0
      }

      const extra = msg.extra || {}
      console.info("checkAndHandleUploadConfirmation 检查并处理上传确认消息:", msg)

      let objectName = extra.originalPath
      if (!objectName) {
        console.warn('checkAndHandleUploadConfirmation 上传确认消息缺少objectName')
        return 0
      }
      objectName = urlUtil.extractObjectName(objectName)

      const uploadingMessage = await messageDao.findByObjectName(objectName)
      if (!uploadingMessage) {
        console.warn(`checkAndHandleUploadConfirmation 未找到对应的上传中消息: ${objectName}`)
        return 0
      }
      if (uploadingMessage.msgType > 1){
        console.warn(`checkAndHandleUploadConfirmation 上传确认消息类型幂等性检验失败: ${uploadingMessage}`)
        return -1
      }

      console.info(`checkAndHandleUploadConfirmation 找到上传中消息，开始回填: messageId=${uploadingMessage.id}`)
      await messageService.handleUploadConfirmation(uploadingMessage.id, msg)

      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow.webContents.send('message:upload:confirmed', {messageId: uploadingMessage.id})

      console.info(`checkAndHandleUploadConfirmation 上传确认处理完成: messageId=${uploadingMessage.id}`)
      return 1

    } catch (error) {
      console.error('处理上传确认消息失败:', error)
      return 0
    }
  }

  public async handleBlack(msg: any): Promise<void> {}
  // 被强制下线、被警告
  public async handleClientEvent(msg: any): Promise<void> {}
}

const websocketHandler = new WebsocketHandler()
export default websocketHandler
