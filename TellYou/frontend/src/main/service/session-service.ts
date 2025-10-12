import { ipcMain } from 'electron'
import sessionDao from '@main/sqlite/dao/session-dao'
import { Session } from '@shared/types/session'
import { Contact } from '@main/service/pull-service'
import messageDao from '@main/sqlite/dao/message-dao'

class SessionService {
  public beginServe(): void {
    ipcMain.handle('session:update:partial', async (_, params: any, sessionId: string) => {
      return await sessionDao.updatePartialBySessionId(params, sessionId)
    })
    ipcMain.on('session:load-data', async (event) => {
      console.log('开始查询session')
      const result: Session[] = await sessionDao.selectSessions()
      console.log('查询结果:', result)
      event.sender.send('session:call-back:load-data', result)
    })
  }
  // 批量设置用户头像、名字
  public async updateBaseUserInfoList(list: any[]): Promise<void> {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        {contactName: info.nickname, contactAvatar: info.avatar}, info.userId)
    }
  }
  // 批量设置群组头像、群名
  public async updateBaseGroupInfoList(list: any[]): Promise<void> {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        {contactName: info.groupName, contactAvatar: info.avatar}, info.groupId)
    }
  }
  // 如果插入后发现不存在，或者 contact_name 或者 contact_avatar 字段缺失，返回 contact，代表要查 api
  public async checkSession(contact: Contact): Promise<any> {
    const obj = {sessionId:contact.sessionId, contactType:contact.contactType, contactId:contact.contactId}
    if (contact.myRole) Object.assign(obj, {myRole:contact.myRole})
    const change = await sessionDao.insertOrIgnoreContact(obj)
    console.info('session-service:check-session:insert:', obj)
    if (change > 0){
      return contact
    } else {
      await sessionDao.updatePartialBySessionId({status: 1} as Partial<Session>, contact.sessionId)
    }
    const one = await sessionDao.selectSingleSession(contact.sessionId)
    if (one?.contactAvatar && one?.contactName){    // session 存在且信息完整
      return {sessionId: contact.sessionId}
    } else {
      return contact
    }
  }
  // 整理所有会话的最后一条消息
  public async tidySession(): Promise<void> {
    const result: Array<{sessionId: string}> = await sessionDao.selectAllSessionId()
    for (const session of result){
      const msgResult: any = await messageDao.getMessageBySessionId(session.sessionId, {limit: 1, direction: 'newest'})
      if (msgResult.messages.length > 0){
        const obj =
          {lastMsgTime: msgResult.messages[0].timestamp.toISOString(), lastMsgContent: msgResult.messages[0].content}
        console.info('session-service:tidy-session:update-session:', obj, session.sessionId)
        await sessionDao.updatePartialBySessionId(obj as Partial<Session>, session.sessionId)
      } else {
        console.info('session-service:tidy-session:no-message:', session.sessionId)
      }
    }
  }
}

export const sessionService = new SessionService()
