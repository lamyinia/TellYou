import { BrowserWindow } from 'electron'
import { netMaster } from '../util/net-util'
import messageDao from '../sqlite/dao/message-dao'
import sessionDao from '../sqlite/dao/session-dao'
import { queryAll } from '../sqlite/atom'
import { Api } from '@main/service/proxy-service'

class PullService {
  async pullStrongTransactionData(): Promise<void> {
    console.log(`正在拉取强事务数据...`)
    try {
      await this.pullFriendContact()
      await this.pullApply()
      await this.pullGroup()
      await this.pullBlackList()

      console.log(`拉取强事务数据完成`)
    } catch (error) {
      console.error(`拉取强事务数据失败:`, error)
      throw error
    }
  }

  // 拉取好友联系人
  private async pullFriendContact(): Promise<void> {
    // TODO: 实现拉取好友联系人逻辑
  }

  // 拉取申请信息
  private async pullApply(): Promise<void> {
    // TODO: 实现拉取申请信息逻辑
  }

  // 拉取群组信息
  private async pullGroup(): Promise<void> {
    // TODO: 实现拉取群组信息逻辑
  }

  // 拉取黑名单
  private async pullBlackList(): Promise<void> {
    // TODO: 实现拉取黑名单逻辑
  }

  // 拉取离线消息
  async pullOfflineMessages(): Promise<void> {
    try {
      console.info('开始拉取用户离线消息...', `${Api.PULL_MAILBOX}`)
      const response = await netMaster.get(Api.PULL_MAILBOX)
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
        const insertId = await messageDao.addLocalMessage(messageData)
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
          sessionDao.updateSessionByMessage({
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
        await this.ackConfirmMessages(messageIds)
      }
      if (pullResult.hasMore) {
        console.info('还有更多离线消息，继续拉取...')
        setTimeout(() => {
          this.pullOfflineMessages()
        }, 0)
      } else {
        console.info('离线消息拉取完成')
      }
    } catch (error) {
      console.error('拉取离线消息异常:', error)
    }
  }
  // 确认消息
  private async ackConfirmMessages(messageIds: string[]): Promise<void> {
    try {
      console.info(`确认 ${messageIds.length} 条消息`, messageIds)
      const requestData = { messageIdList: messageIds }
      const response = await netMaster.post(Api.ACK_CONFIRM, requestData)

      if (response.data.success) {
        console.info('消息确认成功')
      } else {
        console.error('消息确认失败:', response.data.errMsg)
      }
    } catch (error) {
      console.error('消息确认异常:', error)
    }
  }
}
// 创建 PullService 实例
const pullService = new PullService()
export { pullService }
