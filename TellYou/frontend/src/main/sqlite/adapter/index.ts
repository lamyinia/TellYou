import { rawMessage } from '@main/sqlite/dao/message-dao'

export const rawMessageToBeInserted = (data: rawMessage) => {
  return {
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
  }
}
