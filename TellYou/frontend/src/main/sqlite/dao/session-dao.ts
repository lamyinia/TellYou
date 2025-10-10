import { Session } from '@renderer/status/session/class'
import { queryAll, update } from '../atom'

class SessionDao {
  public async selectSessions(): Promise<Session[]> {
    const sql: string = `
      SELECT session_id,
             contact_id,
             contact_type,
             contact_name,
             contact_avatar,
             contact_signature,
             last_msg_content,
             last_msg_time,
             unread_count,
             is_pinned,
             is_muted,
             created_at,
             updated_at,
             member_count,
             max_members,
             join_mode,
             msg_mode,
             group_card,
             group_notification,
             my_role,
             join_time,
             last_active
      FROM sessions
    `
    const result = await queryAll(sql, [])
    return result as unknown as Session[]
  }

  public async updateSessionByMessage(data: { content: string, sendTime: string, sessionId: string }): Promise<void> {
    await update('sessions', {
      lastMsgContent: data.content,
      lastMsgTime: data.sendTime
    }, { sessionId: data.sessionId })
  }

  public async updatePartial(params: Partial<Session>, sessionId: string): Promise<number> {
    try {
      console.log(params)
      const result = await update('sessions', params, { sessionId: sessionId })
      return result
    } catch {
      console.error('updateSession 失败')
      return 0
    }
  }
}

const sessionDao = new SessionDao()
export default sessionDao
