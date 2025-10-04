import messageDao from '../sqlite/dao/message-dao'
import { BrowserWindow } from 'electron'
import sessionDao from '@main/sqlite/dao/session-dao'
import { queryAll } from '@main/sqlite/atom'
import { Session } from '@renderer/status/session/class'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'

type ServerMsg = {
  messageId: string
  sessionId: string
  senderId: string
  sequenceNumber: string
  messageType?: number
  type?: number
  fromName?: string
  content: string
  adjustedTimestamp: string
  extra: Record<string, unknown>
}

export const handleMessage = async (msg: ServerMsg, ws: WebSocket): Promise<void> => {
  console.log(msg)

  const snap = Number(msg.adjustedTimestamp)
  const insertId = await messageDao.addLocalMessage({
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
  if (!insertId || insertId <= 0) return

  const mainWindow = BrowserWindow.getAllWindows()[0]
  await sessionDao.updateSessionByMessage({
    content: msg.content,
    sendTime: new Date(snap).toISOString(),
    sessionId: msg.sessionId
  })

  const vo = {
    id: Number(insertId) || 0,
    sessionId: msg.sessionId,
    content: String(msg.content ?? ''),
    messageType: 'text' as const,
    senderId: msg.senderId,
    senderName: msg.fromName ?? '',
    timestamp: new Date(snap),
    isRead: true,
    avatarVersion: String(msg.extra['avatarVersion']),
    nicknameVersion: String(msg.extra['nicknameVersion'])
  }

  ws.send(
    JSON.stringify({
      messageId: msg.messageId,
      type: 101,
      fromUid: store.get(uidKey)
    })
  )
  const session: Session = (
    (await queryAll('select * from sessions where session_id = ?', [
      msg.sessionId
    ])) as unknown as Session[]
  )[0]

  mainWindow?.webContents.send('loadMessageDataCallback', [vo])
  mainWindow?.webContents.send('loadSessionDataCallback', [session])
}
