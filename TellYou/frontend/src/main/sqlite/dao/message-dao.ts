import { insertOrIgnore, queryAll } from '../sqlite-operation'

export const addLocalMessage = async (data: {
  sessionId: string
  sequenceId: string | number
  senderId: string
  messageId: string
  senderName?: string
  msgType: number
  text?: string
  extData?: string
  sendTime: string
  isRead?: number
}): Promise<number> => {
  const changes = await insertOrIgnore('messages', {
    sessionId: data.sessionId,
    sequenceId: String(data.sequenceId),
    senderId: data.senderId,
    msgId: data.messageId,
    senderName: data.senderName ?? '',
    msgType: data.msgType,
    isRecalled: 0,
    text: data.text ?? '',
    extData: data.extData ?? '',
    sendTime: data.sendTime,
    isRead: data.isRead ?? 1
  })
  if (!changes) return 0

  const rows = (await queryAll(
    'SELECT id FROM messages WHERE session_id = ? AND sequence_id = ? LIMIT 1',
    [data.sessionId, String(data.sequenceId)]
  )) as Array<{ id: number }>
  
  return rows[0]?.id ?? 0
}

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

export const getMessageBySessionId = async (
  sessionId: string,
  options: MessageQueryOptions
): Promise<{ messages: unknown[]; hasMore: boolean; totalCount: number }> => {
  try {
    const limit = Math.max(1, Math.min(Number(options?.limit) || 50, 200))
    const direction: 'newest' | 'older' | 'newer' = options?.direction || 'newest'
    const beforeId: number | undefined = options?.beforeId
    const afterId: number | undefined = options?.afterId

    let where = 'WHERE session_id = ?'
    const params: unknown[] = [sessionId]

    if (direction === 'older' && beforeId) {
      where += ' AND id < ?'
      params.push(beforeId)
    }
    if (direction === 'newer' && afterId) {
      where += ' AND id > ?'
      params.push(afterId)
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

    const messages = rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      content: r.text ?? '',
      messageType: ((): 'text' | 'image' | 'file' | 'system' => {
        switch (r.msgType) {
          case 1: return 'text'
          case 2: return 'image'
          case 5: return 'file'
          default: return 'system'
        }
      })(),
      senderId: r.senderId,
      senderName: r.senderName || '',
      senderAvatar: '',
      timestamp: new Date(r.sendTime),
      isRead: !!r.isRead
    }))

    const totalCountRow = (await queryAll(
      'SELECT COUNT(1) as total FROM messages WHERE session_id = ?',
      [sessionId]
    )) as Array<{ total: number }>
    const totalCount = totalCountRow[0]?.total || 0

    let hasMore = false
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].id
      const moreRow = (await queryAll(
        'SELECT COUNT(1) as cnt FROM messages WHERE session_id = ? AND id < ?',
        [sessionId, lastId]
      )) as Array<{ cnt: number }>
      hasMore = (moreRow[0]?.cnt || 0) > 0
    }

    return { messages, hasMore, totalCount }
  } catch (error) {
    console.error('获取会话消息失败:', error)
    return { messages: [], hasMore: false, totalCount: 0 }
  }
}
