/* eslint-disable */

import type { Message } from "@shared/types/session"

class MessageAdapter {
  /**
   * 将 WebSocket 消息转换为 Message 对象
   */
  public adaptWebSocketMessage(msg: any, insertId: number): Message {
    // 判断是否是系统消息（type 51-55）
    const getMessageType = (msgType: number | undefined): "text" | "image" | "video" | "voice" | "file" | "system" => {
      if (!msgType) return "text"
      switch (msgType) {
        case 1:
        case 21:
          return "text"
        case 2: case 22: return "image"
        case 3: case 23: return "video"
        case 4: case 24: return "voice"
        case 5: case 25: return "file"
        case 51: case 52: case 53: case 54: case 55: return "system"
        default: return "text"
      }
    }

    const msgType = msg.type || msg.messageType
    const messageType = getMessageType(Number(msgType))

    return {
      id: Number(insertId) || 0,
      sessionId: msg.sessionId,
      content: String(msg.content ?? ""),
      messageType: messageType,
      senderId: msg.senderId || msg.fromUserId || "0",
      senderName: msg.fromName ?? "",
      timestamp: new Date(Number(msg.adjustedTimestamp || msg.timestamp || Date.now())),
      isRead: true,
      avatarVersion: String(msg.extra?.["avatarVersion"] || ""),
      nicknameVersion: String(msg.extra?.["nicknameVersion"] || ""),
    }
  }

  /**
   * 将 WebSocket 消息转换为数据库消息格式
   */
  public adaptToDatabaseMessage(message: any): any {
    const date = new Date(Number(message.adjustedTimestamp || message.timestamp || Date.now())).toISOString()
    // 系统消息可能使用 type 字段而不是 messageType
    const msgType = message.messageType || 1
    return {
      sessionId: String(message.sessionId),
      sequenceId: message.sequenceNumber || 0,
      senderId: String(message.senderId || message.fromUserId || "0"),
      msgId: message.messageId || String(Date.now()),
      senderName: message.fromName || "",
      msgType: Number(msgType),
      isRecalled: 0,
      text: message.content || "",
      extData: JSON.stringify(message.extra || {}),
      sendTime: date,
      isRead: 1,
    }
  }

  /**
   * 将数据库消息行转换为 Message 对象
   */
  public adaptMessageRowToMessage(row: any): Message {
    const extData = JSON.parse(row.extData || "{}")
    const getMessageType = (msgType: number): "text" | "image" | "video" | "voice" | "file" | "system" | "uploading" | "upload_failed" => {
      switch (msgType) {
        case 0: return "uploading"
        case -1: return "upload_failed"
        case 1:
        case 21:
          return "text"
        case 2: case 22: return "image";
        case 3: case 23: return "video";
        case 4: case 24: return "voice";
        case 5: case 25: return "file";
        case 51: case 52: case 53: case 54: case 55: return "system";
        default: return "system";
      }
    }
    return {
      id: row.id,
      sessionId: row.sessionId,
      content: row.text || row.extData || "",
      messageType: getMessageType(row.msgType),
      senderId: row.senderId,
      senderName: row.senderName || "",
      timestamp: new Date(row.sendTime),
      isRead: !!row.isRead,
      avatarVersion: String(extData.avatarVersion || ""),
      nicknameVersion: String(extData.nicknameVersion || ""),
    }
  }
}

const messageAdapter = new MessageAdapter()
export default messageAdapter
