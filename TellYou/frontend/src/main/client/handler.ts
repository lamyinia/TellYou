import { addLocalMessage } from '../sqlite/dao/message-dao'
import { BrowserWindow } from 'electron'

type ServerMsg = {
  messageId: string
  sessionId: string
  senderId: string
  sequenceNumber: string
  messageType?: number
  type?: number
  fromName?: string
  content: string
  adjustedTimestamp: string // 对标 System.currentTimeMillis()
  extra?: Record<string, unknown>
}

export const handleMessage = async (msg: ServerMsg): Promise<void> => {
  console.log(msg)

  const snap = Number(msg.adjustedTimestamp)
  const insertId = await addLocalMessage({
    sessionId: msg.sessionId,
    sequenceId: msg.sequenceNumber,
    senderId: msg.senderId,
    messageId: msg.messageId,
    senderName: msg.fromName ?? '',
    msgType: 1,
    text: String(msg.content ?? ''),
    extData: JSON.stringify(msg.extra),
    sendTime: new Date(snap).toISOString(),
    isRead: 1
  })

  if (!insertId || insertId <= 0) {
    return
  }

  const chatMsg = {
    id: Number(insertId) || 0,
    sessionId: msg.sessionId,
    content: String(msg.content ?? ''),
    messageType: 'text' as const,
    senderId: msg.senderId,
    senderName: msg.fromName ?? '',
    senderAvatar: '',
    timestamp: new Date(snap),
    isRead: true
  }


  const mainWindow = BrowserWindow.getAllWindows()[0]
  mainWindow?.webContents.send('loadMessageDataCallback', msg.sessionId, chatMsg)
}
