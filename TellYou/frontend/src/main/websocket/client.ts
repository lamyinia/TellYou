import WebSocket from 'ws'
import { store } from '../index'
import { BrowserWindow } from 'electron'
import { getMessageId } from '../../utils/process'
import { handleMessage } from '@main/websocket/handler'

let ws: WebSocket|null = null
let maxReConnectTimes: number | null = null;
let lockReconnect = false;
let needReconnect: null|boolean = null;
let wsUrl: string | null = null;

export const initWs = (): void => {
  wsUrl = import.meta.env.VITE_REQUEST_WS_URL
  console.info(`wsUrl 连接的url地址:  ${wsUrl}`)
  needReconnect = true
  maxReConnectTimes = 20
}

const isWsOpen = (): boolean => !!ws && ws.readyState === WebSocket.OPEN

export const sendText = (payload: Record<string, unknown>): void => {
  if (!isWsOpen()) {
    console.warn('WebSocket 未连接，发送取消')
    throw new Error('WebSocket is not connected')
  }

  const fromUId = String(payload.fromUId || '')
  const toUserId = String(payload.toUserId || '')
  const sessionId = String(payload.sessionId || '')
  const content = payload.content as unknown

  if (!fromUId || !sessionId) {
    console.warn('缺少必要字段 fromUId 或 sessionId，发送取消')
    throw new Error('Missing required fields: fromUId/sessionId')
  }

  let base = {
    messageId: getMessageId(),
    type: 1,
    fromUId,
    toUserId,
    sessionId,
    content,
    timestamp: Date.now(),
    extra: { platform: 'desktop'}
  }

  ws.send(JSON.stringify(base))
/*  for (let i: number = 0; i < 999; i++){
    base.messageId = getMessageId()
    base.content = `${payload.content} - 测试消息 #${i + 1} - 时间: ${new Date().toLocaleTimeString()} - ID: ${base.messageId}`
    base.timestamp = Date.now() + i
    ws.send(JSON.stringify(base))
  }*/
}

const reconnect = (): void => {
  if (!needReconnect){
    console.info("不允许重试服务")
    return
  }
  console.info('连接关闭，现在正在重试....')
  if (ws != null){
    ws.close()
  }
  if (lockReconnect){
    return
  }
  console.info("重试请求发起")
  lockReconnect = true
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    console.info('重试请求发起，剩余重试次数:' + maxReConnectTimes);
    -- maxReConnectTimes;
    setTimeout(function () {
      connectWs();
      lockReconnect = false;
    }, 5000);
  } else {
    console.info('TCP 连接超时');
  }
}


export const connectWs = (): void => {
  if (wsUrl == null) return
  const token: string = store.get('token')
  if (token === null){
    console.info('token 不满足条件')
    return
  }
  const urlWithToken: string = wsUrl.includes('?') ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`

  ws = new WebSocket(urlWithToken)

  ws.on('open', () => {
    console.info('客户端连接成功')
    maxReConnectTimes = 20

    setInterval(() => {
      ws.send(JSON.stringify({
        type: 0,
        fromUid: "2",
        timestamp: Date.now(),
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
        await handleMessage(msg, ws)
        break;
    }

  })

}
