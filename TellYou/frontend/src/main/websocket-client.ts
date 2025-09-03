import WebSocket from 'ws'
import { store } from './index'
import { BrowserWindow } from 'electron'
import { logger } from '../utils/log-util'

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
      }));
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

  })

}
