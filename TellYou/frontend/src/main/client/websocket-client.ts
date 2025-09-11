import WebSocket from 'ws'
import { store } from '../index'
import { BrowserWindow } from 'electron'
import { logger } from '../../utils/log-util'
import { getMessageId } from '../../utils/process'
import { handleMessage } from '@main/client/handler'

let ws: WebSocket|null = null
let maxReConnectTimes: number | null = null;
let lockReconnect = false;
let needReconnect: null|boolean = null;
let wsUrl: string | null = null;

export const initWs = (): void => {
  wsUrl = import.meta.env.VITE_REQUEST_WS_URL
  logger.debug(`wsUrl 连接的url地址:  ${wsUrl}`)
  needReconnect = true
  maxReConnectTimes = 20
}

const isWsOpen = (): boolean => !!ws && ws.readyState === WebSocket.OPEN

export const sendText = (payload: Record<string, unknown>): void => {
  if (!isWsOpen()) {
    logger.warn('WebSocket 未连接，发送取消')
    throw new Error('WebSocket is not connected')
  }

  const fromUId = String(payload.fromUId || '')
  const toUserId = String(payload.toUserId || '')
  const sessionId = String(payload.sessionId || '')
  const content = payload.content as unknown

  if (!fromUId || !sessionId) {
    logger.warn('缺少必要字段 fromUId 或 sessionId，发送取消')
    throw new Error('Missing required fields: fromUId/sessionId')
  }

  const base = {
    messageId: getMessageId(),
    type: 1,
    fromUId,
    toUserId,
    sessionId,
    content,
    timestamp: Date.now(),
    extra: { platform: 'desktop'}
  }

  ws!.send(JSON.stringify(base))
}

const reconnect = (): void => {
  if (!needReconnect){
    logger.info("不允许重试服务")
    return
  }
  logger.info('连接关闭，现在正在重试....')
  if (ws != null){
    ws.close()
  }
  if (lockReconnect){
    return
  }
  logger.info("重试请求发起")
  lockReconnect = true
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    logger.info('重试请求发起，剩余重试次数:' + maxReConnectTimes);
    -- maxReConnectTimes;
    setTimeout(function () {
      connectWs();
      lockReconnect = false;
    }, 5000);
  } else {
    logger.info('TCP 连接超时');
  }
}


export const connectWs = (): void => {
  if (wsUrl == null) return
  const token: string = store.get('token')
  if (token === null){
    logger.info('token 不满足条件')
    return
  }
  const urlWithToken: string = wsUrl.includes('?') ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`

  ws = new WebSocket(urlWithToken)

  ws.on('open', () => {
    logger.info('客户端连接成功')
    maxReConnectTimes = 20

    setInterval(() => {
      ws.send(JSON.stringify({
        messageId: 1,
        type: 0,
        fromUserId: "2",
        toUserId: 1,
        sessionId: 1,
        content: 1,
        timestamp: Date.now(),
        extra: {
          something: "nothing",
        }
      }))
    }, 1000 * 5)

    const mainWindow = BrowserWindow.getFocusedWindow()
    if (mainWindow){
      mainWindow.webContents.send('ws-connected')
    }
  })
  ws.on('close', () => {
    reconnect()
  })
  ws.on('error', () => {
    reconnect()
  })

  ws.on('message', async (data) => {
    console.log('收到消息:', data.toString())
    const msg = JSON.parse(data)

    switch (msg.messageType){
      case 1:
        await handleMessage(msg)
        break;
    }

  })

}
