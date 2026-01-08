/* eslint-disable */

import { netMaster } from "@main/util/net-util"
import { Api } from "@main/service/proxy-service"
import { messageService } from "@main/service/message-service"
import sessionDao from "@main/sqlite/dao/session-dao"
import { Contact, sessionService } from "@main/service/session-service"
import applicationDao from "@main/sqlite/dao/application-dao"
import { applicationService } from "@main/service/application-service"

class PullService {
  public async pullData(): Promise<void> {
    try {
      await this.pullContact()
      await this.pullApply()
      await this.pullMailboxMessages()
      console.log(`pull-service:pull-data:completed`)
    } catch (error) {
      console.error(`pull-service:pull-data:fail:`, error)
      throw error
    }
  }
  // 重新拉取会话信息
  private async pullContact(): Promise<void> {
    console.log(`pull-service:pull-session:begin`)
    const response = await netMaster.get(Api.PULL_CONTACT)
    if (!response.data.success) {
      console.error(
        "pull-service:pull-friend-contact:拉取 session 失败:",
        response.data.errMsg,
      )
      return
    }
    const result = response.data.data
    console.log("pull-service:pullContact:result", result)
    await this.adjustLocalDb(result)
  }
  // 游标拉取申请通知
  public async pullApply(): Promise<void> {
    console.log("pull-service:pull-apply:begin")
    const cursor = await applicationDao.getIncomingCursor()
    console.log("pull-service:pull-apply:cursor", cursor)

    const payload = { pageSize: 100 } as { pageSize: number; cursor?: string }
    if (cursor) Object.assign(payload, { cursor })
    let response = await netMaster.get(Api.PULL_INCOMING, {
      params: payload,
    })
    if (!response.data.success) {
      console.error(
        "pull-service:pull-apply:拉取申请通知失败:",
        response.data.errMsg,
      )
      return
    }

    await applicationService.handleMoreApplication(response.data.data.list)
    while (!response.data.data.isLast) {
      payload.cursor = response.data.data.cursor
      response = await netMaster.get(Api.PULL_INCOMING, { params: payload })
      if (!response.data.success) {
        console.error(
          "pull-service:pull-apply:拉取申请通知失败:",
          response.data.errMsg,
        )
        return
      }
      await applicationService.handleMoreApplication(response.data.data.list)
    }
  }
  // 拉取用户信箱的所有消息
  async pullMailboxMessages(): Promise<void> {
    try {
      console.info(
        "pull-service:pull-offline-message:开始拉取用户离线消息...",
        `${Api.PULL_MAILBOX}`,
      )
      const response = await netMaster.get(Api.PULL_MAILBOX)
      if (!response.data.success) {
        console.error(
          "pull-service:pull-offline-message:拉取离线消息失败:",
          response.data.errMsg,
        )
        return
      }
      const pullResult = response.data.data
      if (
        !pullResult ||
        !pullResult.messageList ||
        pullResult.messageList.length === 0
      ) {
        console.info("pull-service:pull-offline-message:没有离线消息需要拉取")
        return
      }
      console.info(
        `pull-service:拉取到 ${pullResult.messageList.length} 条离线消息`,
      )

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
        console.info("还有更多离线消息，继续拉取...")
        setTimeout(() => {
          this.pullMailboxMessages()
        }, 0)
      } else {
        console.info("离线消息拉取完成")
      }
    } catch (error) {
      console.error("拉取离线消息异常:", error)
    }
  }
  // 批量 ack 确认
  private async ackConfirmMessages(messageIds: string[]): Promise<void> {
    try {
      console.info(`确认 ${messageIds.length} 条消息`, messageIds)
      const requestData = { messageIdList: messageIds }
      const response = await netMaster.post(Api.ACK_CONFIRM, requestData)

      if (response.data.success) {
        console.info("消息确认成功")
      } else {
        console.error("消息确认失败:", response.data.errMsg)
      }
    } catch (error) {
      console.error("消息确认异常:", error)
    }
  }
  // 修正本地数据库，根据本地数据是否缺失，策略化请求 api 拿头像、名字信息
  private async adjustLocalDb(myContactList: MyContactList): Promise<void> {
    try {
      if (
        !myContactList ||
        !myContactList.contactList ||
        !Array.isArray(myContactList.contactList)
      ) {
        console.warn(
          "pull-service:adjust-local-db:contactList 数据无效:",
          myContactList,
        )
        return
      }
      console.info(
        "pull-service:adjust-local-db:开始处理联系人列表，数量:",
        myContactList.contactList.length,
      )
      await sessionDao.abandonAllSession()
      await sessionService.fillSession(myContactList.contactList)
    } catch (error) {
      console.error("pull-service:adjust-local-db:处理失败:", error)
      throw error
    }
  }
}

interface MyContactList {
  contactList: Contact[]
}

export type { MyContactList }

const pullService = new PullService()
export { pullService }
