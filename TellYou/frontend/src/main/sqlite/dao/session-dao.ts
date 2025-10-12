import { insertOrIgnore, queryAll, sqliteRun, update } from '../atom'
import { Session } from '@shared/types/session'

class SessionDao {
  public async selectSessions(): Promise<Session[]> {
    const sql: string = 'select * from sessions'
    const result = await queryAll(sql, [])
    return result as unknown as Session[]
  }

  public async selectSingleSession(sessionId: string): Promise<Session> {
    const sql: string = 'select * from sessions where session_id = ?'
    const result = await queryAll(sql, [sessionId])
      return result[0] as unknown as Session
    }

  // 为了校正无效的 session，先全部弃用
  public async abandonAllSession(): Promise<number> {
    try {
      const sql = 'UPDATE sessions SET status = 0'
      const result = await sqliteRun(sql, [])
      console.log(`session-dao:已弃用 ${result} 个会话`)
      return result
    } catch (error) {
      console.error('session-dao:弃用所有会话失败:', error)
      throw error
    }
  }

  public async insertOrIgnoreContact(contact: Partial<Session>): Promise<number> {
    return insertOrIgnore("sessions", contact)
  }

  // 只有消息更新，才需要更新会话
  public async keepSessionFresh(data: { content: string, sendTime: string, sessionId: string }): Promise<number> {
      const sql = `UPDATE sessions
                 SET last_msg_time = ?, last_msg_content = ?
                 WHERE session_id = ? AND datetime(?) > datetime(last_msg_time)`
      return sqliteRun(sql, [data.sendTime, data.content, data.sessionId, data.sendTime])
  }

  //  根据 sessionId，更新会话的某些字段
  public async updatePartialBySessionId(params: Partial<Session>, sessionId: string): Promise<number> {
    try {
      const result = await update('sessions', params, { sessionId: sessionId })
      return result
    } catch {
      console.error('updatePartialBySessionId:updateSession 失败')
      return 0
    }
  }
  //  根据 contactId，更新会话的某些字段
  public async updatePartialByContactId(params: Partial<Session>, contactId: string): Promise<number> {
    try {
      const result = await update('sessions', params, { contactId: contactId })
      return result
    } catch {
      console.error('updatePartialByContactId:updateSession 失败')
      return 0
    }
  }
  public async selectAllSessionId(): Promise<Array<{sessionId: string}>> {
    const sql = 'SELECT session_id FROM sessions'
    const result = await queryAll(sql, [])
    return result as unknown as Array<{sessionId: string}>
  }
}

const sessionDao = new SessionDao()
export default sessionDao
