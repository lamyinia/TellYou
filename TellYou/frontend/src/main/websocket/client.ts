import WebSocket from 'ws'
import { store } from '../index'
import websocketHandler from '@main/websocket/handler'
import { tokenKey } from '@main/electron-store/key'
import channelUtil from '@main/util/channel-util'

let ws: WebSocket | null = null
let maxReConnectTimes: number | null = null
let lockReconnect = false
let needReconnect: null | boolean = null
let wsUrl: string | null = null

export const wsConfigInit = (): void => {
  wsUrl = import.meta.env.VITE_REQUEST_WS_URL
  console.info(`wsUrl 连接的url地址:  ${wsUrl}`)
  needReconnect = true
  maxReConnectTimes = 20
}

const reconnect = (): void => {
  if (!needReconnect) {
    console.info('不允许重试服务')
    return
  }
  console.info('连接关闭，现在正在重试....')
  if (ws != null) {
    ws.close()
  }
  if (lockReconnect) {
    return
  }
  console.info('重试请求发起')
  lockReconnect = true
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    console.info('重试请求发起，剩余重试次数:' + maxReConnectTimes)
    --maxReConnectTimes
    setTimeout(function () {
      connectWs()
      lockReconnect = false
    }, 5000)
  } else {
    console.info('TCP 连接超时')
  }
}

export const connectWs = (): void => {
  if (wsUrl == null) return
  const token: string = store.get(tokenKey)
  if (token === null) {
    console.info('token 不满足条件')
    return
  }
  const urlWithToken: string = wsUrl.includes('?') ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`
  ws = new WebSocket(urlWithToken)
  channelUtil.registerChannel(ws)
  ws.on('open', () => {
    console.info('客户端连接成功')
    maxReConnectTimes = 100
  })
  ws.on('close', () => {
    reconnect()
  })
  ws.on('error', () => {
    reconnect()
  })
  ws.on('message', async (data: any) => {
    console.info('收到消息:', data.toString())
    const msg = JSON.parse(data)
    const type: number = msg.messageType || null
    if (type && type >= 1 && type <= 30){
      await websocketHandler.handleChatMessage(msg)
    }
  })
}
