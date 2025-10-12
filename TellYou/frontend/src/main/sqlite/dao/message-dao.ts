import { insertOrIgnore, queryAll } from '../atom'
import messageAdapter from '../adapter/message-adapter'

type MessageQueryOptions = {
  limit?: number
  direction?: 'newest' | 'older' | 'newer'
  beforeId?: number
  afterId?: number
}
type MessageRow = {
  id: number
  sessionId: string
  sequenceId: string
  senderId: string
  senderName: string
  msgType: number
  isRecalled: number
  text: string
  extData: string
  sendTime: string
  isRead: number
}
class MessageDao {
  public async addLocalMessage(data: any): Promise<number> {
    const changes = await insertOrIgnore('messages', data)
    if (!changes) return 0
    const rows = (await queryAll(
      'SELECT id FROM messages WHERE session_id = ? AND sequence_id = ? LIMIT 1',
      [data.sessionId, String(data.sequenceId)]
    )) as Array<{ id: number }>
    return rows[0].id
  }
  public async getMessageBySessionId(sessionId: string, options: MessageQueryOptions
  ): Promise<{ messages: unknown[]; hasMore: boolean; totalCount: number }> {
    try {
      const limit = Number(options?.limit) || 50
      const direction: 'newest' | 'older' | 'newer' = options?.direction || 'newest'
      const beforeId: number | undefined = options?.beforeId
      const afterId: number | undefined = options?.afterId

      let where = 'WHERE session_id = ?'
      const params: unknown[] = [sessionId]

      if (direction === 'older' && beforeId) {
        const beforeMessage = (await queryAll('SELECT send_time FROM messages WHERE id = ?', [
          beforeId
        ])) as Array<{ sendTime: string }>
        if (beforeMessage.length > 0) {
          where += ' AND send_time < ?'
          params.push(beforeMessage[0].sendTime)
        }
      } else if (direction === 'newer' && afterId) {
        const afterMessage = (await queryAll('SELECT send_time FROM messages WHERE id = ?', [
          afterId
        ])) as Array<{ sendTime: string }>
        if (afterMessage.length > 0) {
          where += ' AND send_time > ?'
          params.push(afterMessage[0].sendTime)
        }
      }
      const sql = `
        SELECT id, session_id, sequence_id, sender_id, sender_name, msg_type, is_recalled,
               text, ext_data, send_time, is_read
        FROM messages
        ${where}
        ORDER BY send_time DESC, id DESC
        LIMIT ${limit}
      `
      const rows = (await queryAll(sql, params)) as MessageRow[]
      const messages = rows.map((r) => messageAdapter.adaptMessageRowToMessage(r))
      const totalCountRow = (await queryAll(
        'SELECT COUNT(1) as total FROM messages WHERE session_id = ?',
        [sessionId]
      )) as Array<{ total: number }>
      const totalCount = totalCountRow[0]?.total || 0
      let hasMore = false
      if (messages.length > 0) {
        const lastMessage: any = messages.at(-1)
        const moreRow = (await queryAll(
          'SELECT COUNT(1) as cnt FROM messages WHERE session_id = ? AND send_time < ?',
          [sessionId, lastMessage.timestamp.toString()]
        )) as Array<{ cnt: number }>
        hasMore = (moreRow[0]?.cnt || 0) > 0
      }
      console.log('查询参数:', options, '返回消息数:', messages.length, 'hasMore:', hasMore)
      return { messages, hasMore, totalCount }
    } catch (error) {
      console.error('获取会话消息失败:', error)
      return { messages: [], hasMore: false, totalCount: 0 }
    }
  }
}
const messageDao = new MessageDao()
export default messageDao
