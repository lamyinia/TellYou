/* eslint-disable */

import sqliteManager from "../atom"
import { Session } from "@shared/types/session"
import { SqliteResult } from "../atom"

class SessionDao {
  public async insertOrReplace(data: any): Promise<SqliteResult> {
    const result = await sqliteManager.insertOrReplace("sessions", data)
    return result
  }
  public async insertOrIgnore(data: any): Promise<SqliteResult> {
    const result = await sqliteManager.insertOrIgnore("sessions", data)
    return result
  }
  public async update(data: Record<string, unknown>, paramData: Record<string, unknown>): Promise<SqliteResult> {
    const result = await sqliteManager.update("sessions", data, paramData)
    return result
  }

  public async selectSessions(): Promise<Session[]> {
    const sql: string = "select * from sessions"
    const result = await sqliteManager.queryAll(sql, [])
    return result as unknown as Session[]
  }

  public async selectSingleSession(sessionId: string): Promise<Session> {
    const sql: string = "select * from sessions where session_id = ?"
    const result = await sqliteManager.queryAll(sql, [sessionId])
    return result[0] as unknown as Session
  }

  // 为了校正无效的 session，先全部弃用
  public async abandonAllSession(): Promise<number> {
    try {
      const sql = "UPDATE sessions SET status = 0"
      const result = await sqliteManager.sqliteRun(sql, []).then(res => res.changes)
      console.log(`session-dao:已弃用 ${result} 个会话`)
      return result
    } catch (error) {
      console.error("session-dao:弃用所有会话失败:", error)
      throw error
    }
  }

  public async insertOrIgnoreContact(contact: Partial<Session>): Promise<number> {
    return this.insertOrIgnore(contact).then(result => result.changes)
  }

  // 只有消息更新，才需要更新会话 20251019（发现 bug，为 null 时不会更新，已修）
  public async keepSessionFresh(data: { content: string, sendTime: string, sessionId: string }): Promise<number> {
    const sql = `UPDATE sessions
                 SET last_msg_time = ?, last_msg_content = ?
                 WHERE session_id = ? AND (last_msg_time IS NULL OR datetime(?) > datetime(last_msg_time))`
    return sqliteManager.sqliteRun(sql, [
      data.sendTime,
      data.content,
      data.sessionId,
      data.sendTime,
    ]).then(result => result.changes)
  }

  //  根据 sessionId，更新会话的某些字段
  public async updatePartialBySessionId(params: Partial<Session>, sessionId: string): Promise<number> {
    try {
      const result = await this.update(params, { sessionId: sessionId })
      return result.changes
    } catch {
      console.error("updatePartialBySessionId:updateSession 失败")
      return 0;
    }
  }
  //  根据 contactId，更新会话的某些字段
  public async updatePartialByContactId(params: Partial<Session>, contactId: string): Promise<number> {
    try {
      const result = await this.update(params, { contactId: contactId });
      return result.changes
    } catch {
      console.error("updatePartialByContactId:updateSession 失败")
      return 0
    }
  }
  //  收集所有 session 的 id
  public async selectAllSessionId(): Promise<Array<{ sessionId: string }>> {
    const sql = "SELECT session_id FROM sessions"
    const result = await sqliteManager.queryAll(sql, [])
    return result as unknown as Array<{ sessionId: string }>
  }
}

const sessionDao = new SessionDao()
export default sessionDao
