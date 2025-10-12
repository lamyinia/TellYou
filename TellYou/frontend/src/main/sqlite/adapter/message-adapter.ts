import { Message } from '@shared/types/session'

class MessageAdapter {
  /**
   * 将 WebSocket 消息转换为 Message 对象
   */
  public adaptWebSocketMessage(msg: any, insertId: number): Message {
    return {
      id: Number(insertId) || 0,
      sessionId: msg.sessionId,
      content: String(msg.content ?? ''),
      messageType: 'text' as const,
      senderId: msg.senderId,
      senderName: msg.fromName ?? '',
      timestamp: new Date(Number(msg.adjustedTimestamp)),
      isRead: true,
      avatarVersion: String(msg.extra['avatarVersion']),
      nicknameVersion: String(msg.extra['nicknameVersion'])
    }
  }

  /**
   * 将 WebSocket 消息转换为数据库消息格式
   */
  public adaptToDatabaseMessage(message: any): any {
    const date = new Date(Number(message.adjustedTimestamp)).toISOString()
    return {
      sessionId: String(message.sessionId),
      sequenceId: message.sequenceNumber,
      senderId: String(message.senderId),
      msgId: message.messageId,
      senderName: message.fromName || '',
      msgType: message.messageType,
      isRecalled: 0,
      text: message.content,
      extData: JSON.stringify(message.extra),
      sendTime: date,
      isRead: 1
    }
  }

  /**
   * 将数据库消息行转换为 Message 对象
   */
  public adaptMessageRowToMessage(row: any): Message {
    const extData = JSON.parse(row.extData || '{}')
    const getMessageType = (msgType: number): 'text' | 'image' | 'video' | 'audio' | 'file' => {
      switch (msgType) {
        case 1:
          return 'text'
        case 2:
          return 'image'
        case 5:
          return 'file'
        default:
          return 'text'
      }
    }
    return {
      id: row.id,
      sessionId: row.sessionId,
      content: row.text ?? '',
      messageType: getMessageType(row.msgType),
      senderId: row.senderId,
      senderName: row.senderName || '',
      timestamp: new Date(row.sendTime),
      isRead: !!row.isRead,
      avatarVersion: String(extData.avatarVersion || ''),
      nicknameVersion: String(extData.nicknameVersion || '')
    }
  }
}

const messageAdapter = new MessageAdapter()
export default messageAdapter
