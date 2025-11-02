/* eslint-disable */

import WebSocket from "ws"
import { getMessageId } from "@shared/utils/process"
import { store } from "@main/index"
import { uidKey } from "@main/electron-store/key"
import sessionDao from "@main/sqlite/dao/session-dao"

class ChannelUtil {
  private channel: WebSocket | null = null

  public isWsOpen = (): boolean => !!this.channel && this.channel.readyState === WebSocket.OPEN

  public registerChannel(channel: WebSocket): void {
    this.channel = channel
  }

  public async sendText(payload: Record<string, unknown>): Promise<void> {
    if (!this.isWsOpen()) return

    const sessionId = String(payload.sessionId)
    const session = await sessionDao.selectSingleSession(sessionId)
    if (!session) {
      console.warn("会话不存在，发送取消")
      return
    }

    const fromUserId = store.get(uidKey)
    const targetId = session.contactId
    const content = String(payload.content)
    const type = session.contactType === 1 ? 1 : 21
    // 单聊文本 1，群聊文本 21

    if (!fromUserId || !targetId || !content || !type) {
      console.warn("缺少必要字段，发送取消")
      return
    }

    const textMessage = {
      messageId: getMessageId(),
      type: type,
      fromUserId,
      targetId,
      sessionId,
      content,
      timestamp: Date.now(),
      extra: { platform: "desktop" },
    }
    this.channel.send(JSON.stringify(textMessage));
  }
  public sendSingleChatAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.messageId,
        type: 101,
        fromUserId: store.get(uidKey),
      }),
    );
  }
  public sendSingleApplicationAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.applyId,
        type: 102,
        fromUserId: store.get(uidKey),
      }),
    );
  }
  public sendSingleSessionAckConfirm(msg: any): void {
    if (!this.isWsOpen()) return
    this.channel.send(
      JSON.stringify({
        messageId: msg.ackId,
        type: 103,
        fromUserId: store.get(uidKey),
      }),
    )
  }
}
const channelUtil = new ChannelUtil()
export default channelUtil
