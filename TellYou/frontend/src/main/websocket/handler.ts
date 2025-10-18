import { BrowserWindow } from 'electron'
import { Session } from '@shared/types/session'
import { messageService } from '@main/service/message-service'
import messageAdapter from '@main/sqlite/adapter/message-adapter'
import sessionDao from '@main/sqlite/dao/session-dao'
import channelUtil from '@main/util/channel-util'
import { applicationService } from '@main/service/application-service'
import { sessionService } from '@main/service/session-service'

class WebsocketHandler {
  public async handleChatMessage(msg: any): Promise<void> {
    console.log('handleMessage', msg)
    const insertId = await messageService.handleSingleMessage(msg)
    if (!insertId || insertId <= 0) return
    const vo = messageAdapter.adaptWebSocketMessage(msg, insertId)
    channelUtil.sendSingleChatAckConfirm(msg)
    const session: Session = await sessionDao.selectSingleSession(msg.sessionId)

    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow.webContents.send('message:call-back:load-data', [vo])
    mainWindow.webContents.send('session:call-back:load-data', [session])
  }

  // 申请通知
  public async handleApplication(msg: any): Promise<void> {
    delete msg.receiverId
    await applicationService.handleSingleApplication(msg)
    channelUtil.sendSingleApplicationAckConfirm(msg)

    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow.webContents.send('income-list:call-back:load-data', 'ping')
    mainWindow.webContents.send('out-send-list:call-back:load-data', 'ping')
  }

  // 填充会话信息，发送 ack 确认，发送渲染进程响应    (单聊、多聊创建，单聊、多聊解散)[往往伴随着会话变更]
  public async handleSession(msg: any): Promise<void> {
    console.info('handle-session:', msg)
    const type = (msg.metaSessionType <= 2 ? 1 : 2)
    Object.assign(msg, {contactType: type})
    await sessionService.fillSession([msg])  // 先填充会话信息，ContactList 只会收集需要的字段
    channelUtil.sendSingleSessionAckConfirm(msg)
    const session = await sessionService.selectSingleSessionById(msg.sessionId)
    console.info('handle-session:select', session)
    if (session){
      const mainWindow = BrowserWindow.getAllWindows()[0]
      mainWindow.webContents.send('session:call-back:load-data', [session])
    }
  }

  public async handleBlack(msg: any): Promise<void> {

  }
  // 被踢、被强制下线、被警告
  public async handleClientEvent(msg: any): Promise<void> {

  }


}

const websocketHandler = new WebsocketHandler()
export default websocketHandler
