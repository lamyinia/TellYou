/* eslint-disable */

import sqliteManager, { SqliteResult } from "../atom";
import messageAdapter from "../adapter/message-adapter";

type MessageQueryOptions = {
  limit?: number
  direction?: "newest" | "older" | "newer"
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

/**
 * 消息 DAO
 * @author lanye
 * @since 2025/11/02 23:17
 */

class MessageDao {
  public async insertOrIgnore(data: any): Promise<SqliteResult> {
    const result = await sqliteManager.insertOrIgnore("messages", data)
    return result
  }
  public async insertOrReplace(data: any): Promise<SqliteResult> {
    const result = await sqliteManager.insertOrReplace("messages", data)
    return result
  }
  public async update(data: Record<string, unknown>, paramData: Record<string, unknown>): Promise<SqliteResult> {
    const result = await sqliteManager.update("messages", data, paramData)
    return result
  }

  public async getMessageBySessionId(sessionId: string, options: MessageQueryOptions): Promise<{ messages: unknown[]; hasMore: boolean; totalCount: number }> {
    try {
      const limit = Number(options?.limit) || 50
      const direction: "newest" | "older" | "newer" =
        options?.direction || "newest"
      const beforeId: number | undefined = options?.beforeId
      const afterId: number | undefined = options?.afterId

      let where = "where session_id = ?"
      const params: unknown[] = [sessionId]

      let sendTimeOrder: string = "desc"
      if (direction === "older" && beforeId) {
        const beforeMessage = (await sqliteManager.queryAll("select send_time from messages where id = ?", [beforeId])) as Array<{ sendTime: string }>
        if (beforeMessage.length > 0) {
          where += " and send_time < ?"
          params.push(beforeMessage[0].sendTime)
        }
      } else if (direction === "newer" && afterId) {
        sendTimeOrder = "asc"
        const afterMessage = (await sqliteManager.queryAll("select send_time from messages where id = ?", [afterId])) as Array<{ sendTime: string }>
        if (afterMessage.length > 0) {
          where += " and send_time > ?"
          params.push(afterMessage[0].sendTime)
        }
      }
      const sql = `
        select id, session_id, sequence_id, sender_id, sender_name, msg_type, is_recalled,
               text, ext_data, send_time, is_read
        from messages
        ${where}
        order by send_time ${sendTimeOrder}, id desc
        LIMIT ${limit}
      `
      const rows = (await sqliteManager.queryAll(sql, params)) as MessageRow[]
      const messages = rows.map((r) => messageAdapter.adaptMessageRowToMessage(r))
      const totalCountRow = (await sqliteManager.queryAll("select count(1) as total from messages where session_id = ?", [sessionId])) as Array<{ total: number }>
      const totalCount = totalCountRow[0]?.total || 0
      let hasMore = false
      if (messages.length > 0) {
        const lastMessage: any = messages.at(-1)
        const moreRow = (await sqliteManager.queryAll("select count(1) as cnt from messages where session_id = ? and send_time < ?", [sessionId, lastMessage.timestamp.toString()])) as Array<{ cnt: number }>
        hasMore = (moreRow[0]?.cnt || 0) > 0
      }
      console.info("查询参数:", options, "返回消息数:", messages.length, "hasMore:", hasMore)
      return { messages, hasMore, totalCount }
    } catch (error) {
      console.error("获取会话消息失败:", error)
      return { messages: [], hasMore: false, totalCount: 0 }
    }
  }

  public async getExtendData(params: { id: number }): Promise<any> {
    try {
      const rows = (await sqliteManager.queryAll("select ext_data from messages where id = ?", [params.id]))
      const extDataString = (rows[0]?.extData as string) || "{}"
      return JSON.parse(extDataString)
    } catch (error) {
      console.error("获取外部数据失败:", error)
      return null
    }
  }

  public async updateLocalPath(id: number, data: { originalLocalPath?: string; thumbnailLocalPath?: string }): Promise<void> {
    try {
      const extData = await this.getExtendData({ id })
      if (data.originalLocalPath !== undefined) {
        extData.originalLocalPath = data.originalLocalPath
      }
      if (data.thumbnailLocalPath !== undefined) {
        extData.thumbnailLocalPath = data.thumbnailLocalPath
      }

      const extDataString = JSON.stringify(extData)
      await sqliteManager.update("messages", { extData: extDataString }, { id })
    } catch (error) {
      console.error("更新扩展数据失败:", error)
    }
  }

  public async insertUploadingMessage(params: {
    sessionId: string,
    msgId: string,
    sequenceId: string,
    senderId: string,
    senderName: string,
    msgType: number,
    text: string,
    extData: string,
    sendTime: string
  }): Promise<number> {
    const data = {
      sessionId: params.sessionId,
      msgId: params.msgId,
      sequenceId: params.sequenceId,
      senderId: params.senderId,
      senderName: params.senderName,
      msgType: params.msgType,
      text: params.text,
      extData: params.extData,
      sendTime: params.sendTime,
      isRead: 0
    }
    const result = await this.insertOrIgnore(data)
    return result.lastInsertRowID || 0
  }

  // 通过objectName查找消息
  public async findByObjectName(objectName: string): Promise<MessageRow | null> {
    const sql = "SELECT * FROM messages WHERE text = ? AND msg_type = 0"
    const rows = await sqliteManager.queryAll(sql, [objectName]) as MessageRow[]
    return rows[0] || null
  }

  // 更新消息状态
  public async updateMessageType(id: number, msgType: number): Promise<void> {
    await this.update({ msgType }, { id })
  }

  // 通过ID获取消息
  public async getById(id: number): Promise<MessageRow | null> {
    const sql = "SELECT * FROM messages WHERE id = ?"
    const rows = await sqliteManager.queryAll(sql, [id]) as MessageRow[]
    return rows[0] || null
  }

  // WebSocket回填消息数据
  public async updateMessageFromWebSocket(id: number, wsMessage: any): Promise<void> {
    const date = new Date(Number(wsMessage.adjustedTimestamp || wsMessage.timestamp || Date.now())).toISOString()
    const currentRow = await this.getById(id)
    if (!currentRow){
      console.warn('updateMessageFromWebSocket 失败，currentRow 为空')
      return
    }
    const currentExtData = JSON.parse(currentRow?.extData || '{}')
    const msgExtData = wsMessage.extra || {}

    const newExtData = {
      ...currentExtData,
      originalPath: msgExtData.originalPath,
      thumbnailPath: msgExtData?.thumbnailPath,
      sequenceId: wsMessage.sequenceNumber
    }

    const updateData = {
      msgType: wsMessage.messageType,
      sequenceId: wsMessage.sequenceNumber,
      extData: JSON.stringify(newExtData),
      sendTime: date
    }

    await this.update(updateData, { id })
  }
}
const messageDao = new MessageDao()
export default messageDao
