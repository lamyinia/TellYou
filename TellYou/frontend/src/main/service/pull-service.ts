import { netMaster } from '../util/net-util'
import { Api } from '@main/service/proxy-service'
import { messageService } from '@main/service/message-service'
import sessionDao from '@main/sqlite/dao/session-dao'
import { sessionService } from '@main/service/session-service'

class PullService {
  public async pullStrongTransactionData(): Promise<void> {
    console.log(`正在拉取强事务数据...`)
    try {
      await this.pullContact()
      console.log(`拉取强事务数据完成`)
    } catch (error) {
      console.error(`拉取强事务数据失败:`, error)
      throw error
    }
  }
  private async pullContact(): Promise<void> {
    const response = await netMaster.get(Api.PULL_CONTACT)
    if (!response.data.success) {
      console.error('pull-service:pull-friend-contact:拉取 session 失败:', response.data.errMsg)
      return
    }
    const result = response.data.data
    console.log('pull-service:pullContact:result', result)
    await this.adjustLocalDb(result)
  }
  // 拉取用户信箱的所有消息
  async pullMailboxMessages(): Promise<void> {
    try {
      console.info('pull-service:pull-offline-message:开始拉取用户离线消息...', `${Api.PULL_MAILBOX}`)
      const response = await netMaster.get(Api.PULL_MAILBOX)
      if (!response.data.success) {
        console.error('pull-service:pull-offline-message:拉取离线消息失败:', response.data.errMsg)
        return
      }
      const pullResult = response.data.data
      if (!pullResult || !pullResult.messageList || pullResult.messageList.length === 0) {
        console.info('pull-service:pull-offline-message:没有离线消息需要拉取')
        return
      }
      console.info(`pull-service:拉取到 ${pullResult.messageList.length} 条离线消息`)

      const promiseList: Promise<any>[] = []
      const messageIds: string[] = []
      for (const message of pullResult.messageList) {
        promiseList.push(messageService.handleSingleMessage(message))
        messageIds.push(message.messageId)
      }
      await Promise.all(promiseList)

      if (messageIds.length > 0) {
        await this.ackConfirmMessages(messageIds)
      }
      if (pullResult.hasMore) {
        console.info('还有更多离线消息，继续拉取...')
        setTimeout(() => {
          this.pullMailboxMessages()
        }, 0)
      } else {
        console.info('离线消息拉取完成')
      }
    } catch (error) {
      console.error('拉取离线消息异常:', error)
    }
  }
  // 批量 ack 确认
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
  // 修正本地数据库，策略化请求 api 拿头像、名字信息
  private async adjustLocalDb(myContactList: MyContactList): Promise<void> {
    try {
      if (!myContactList || !myContactList.contactList || !Array.isArray(myContactList.contactList)) {
        console.warn('pull-service:adjust-local-db:contactList 数据无效:', myContactList)
        return
      }
      console.info('pull-service:adjust-local-db:开始处理联系人列表，数量:', myContactList.contactList.length)
      await sessionDao.abandonAllSession()
      const groupList: string[] = []
      const userList: string[] = []
      const promiseList: Promise<any>[] = []
      myContactList.contactList.forEach(contact => {
        promiseList.push(sessionService.checkSession(contact))
      })
      const resultList = await Promise.all(promiseList)
      for (const result of resultList) {
        if (result && result.contactId) {
          if (result.contactType === 1) {
            userList.push(result.contactId)
          } else if (result.contactType === 2) {
            groupList.push(result.contactId)
          }
        }
      }
      if (userList.length > 0) {
        console.info('pull-service:adjust-local-db:需要获取用户信息，数量:', userList.length)
        try {
          const response = await netMaster.post(Api.GET_BASE_USER, { targetList: userList })
          if (response.data.success) {
            const data = response.data.data
            console.info('pull-service:adjust-local-db:获取用户信息成功，数量:', data.userInfoList?.length || 0)
            await sessionService.updateBaseUserInfoList(data.userInfoList)
          } else {
            console.error('pull-service:adjust-local-db:获取用户信息失败:', response.data.errMsg)
          }
        } catch (error) {
          console.error('pull-service:adjust-local-db:获取用户信息异常:', error)
        }
      }
      if (groupList.length > 0) {
        console.info('pull-service:adjust-local-db:需要获取群组信息，数量:', groupList.length)
        try {
          const response = await netMaster.post(Api.GET_BASE_GROUP, { targetList: groupList })
          if (response.data.success) {
            const data = response.data.data
            console.info('pull-service:adjust-local-db:获取群组信息成功，数量:', data.groupInfoList?.length || 0)
            await sessionService.updateBaseGroupInfoList(data.groupInfoList)
          } else {
            console.error('pull-service:adjust-local-db:获取群组信息失败:', response.data.errMsg)
          }
        } catch (error) {
          console.error('pull-service:adjust-local-db:获取群组信息异常:', error)
        }
      }
    } catch (error) {
      console.error('pull-service:adjust-local-db:处理失败:', error)
      throw error
    }
  }
}

interface Contact {
  sessionId: string
  contactId: string
  myRole: number
  contactType: number
}
interface MyContactList {
  contactList: Contact[]
}

export type { Contact, MyContactList }

const pullService = new PullService()
export { pullService }
