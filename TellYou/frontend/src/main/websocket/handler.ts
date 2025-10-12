import { BrowserWindow } from 'electron'
import { Session } from '@shared/types/session'
import { messageService } from '@main/service/message-service'
import messageAdapter from '@main/sqlite/adapter/message-adapter'
import sessionDao from '@main/sqlite/dao/session-dao'
import channelUtil from '@main/util/channel-util'

class WebsocketHandler {
  public async handleChatMessage(msg: any): Promise<void> {
    console.log('handleMessage', msg)
    const insertId = await messageService.handleSingleMessage(msg)
    if (!insertId || insertId <= 0) return
    const vo = messageAdapter.adaptWebSocketMessage(msg, insertId)
    channelUtil.sendSingleAckConfirm(msg)
    const session: Session = await sessionDao.selectSingleSession(msg.sessionId)

    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow.webContents.send('message:call-back:load-data', [vo])
    mainWindow.webContents.send('session:call-back:load-data', [session])
  }
}

const websocketHandler = new WebsocketHandler()
export default websocketHandler
