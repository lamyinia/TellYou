import WebSocket from 'ws'
import { getMessageId } from '@shared/utils/process'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'

class ChannelUtil {
  private channel: WebSocket | null = null

  public isWsOpen = (): boolean => !!this.channel && this.channel.readyState === WebSocket.OPEN

  public registerChannel(channel: WebSocket): void {
    this.channel = channel
  }

  public sendText(payload: Record<string, unknown>): void {
    if (!this.isWsOpen()) return
    const fromUserId = String(payload.fromUId || '')
    const targetId = String(payload.toUserId || '')
    const sessionId = String(payload.sessionId || '')
    const content = payload.content
    if (!fromUserId || !sessionId) {
      console.warn('缺少必要字段 fromUId 或 sessionId，发送取消')
      return
    }
    const base = {
      messageId: getMessageId(),
      type: 1,
      fromUserId,
      targetId,
      sessionId,
      content,
      timestamp: Date.now(),
      extra: { platform: 'desktop' }
    }
    this.channel.send(JSON.stringify(base))
  }
  public sendSingleChatAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.messageId,
        type: 101,
        fromUserId: store.get(uidKey)
      })
    )
  }
  public sendSingleApplicationAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.applyId,
        type: 102,
        fromUserId: store.get(uidKey)
      })
    )
  }
  public sendSingleSessionAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.ackId,
        type: 103,
        fromUserId: store.get(uidKey)
      })
    )
  }
}
const channelUtil = new ChannelUtil()
export default channelUtil
