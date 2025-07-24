import WebSocket from 'ws'
import { store } from './index'
import { useRouter } from 'vue-router'
import { BrowserWindow } from 'electron'

let ws: WebSocket|null = null
let maxReConnectTimes: number | null = null;
let lockReconnect = false;
let needReconnect: null|boolean = null;
let wsUrl: string | null = null;


export const initWs = (): void => {
  wsUrl = import.meta.env.VITE_REQUEST_WS_URL
  console.log(`wsUrl to connect:  ${wsUrl}`)
  needReconnect = true
  maxReConnectTimes = 20
}
const reconnect = (): void => {
  if (!needReconnect){
    console.log("CONDITION DO NOT NEED RECONNECT")
    return
  }
  if (ws != null){
    ws.close()
  }
  if (lockReconnect){
    return
  }
  console.log("READY TO RECONNECT")
  lockReconnect = true
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    console.log('READY TO RECONNECT, RARE TIME:' + maxReConnectTimes);
    -- maxReConnectTimes;
    setTimeout(function () {
      connectWs();
      lockReconnect = false;
    }, 5000);
  } else {
    console.log('TCP CONNECTION TIMEOUT');
  }
}

export const connectWs = (): void => {
  if (wsUrl == null) return
  const token: string = store.get('token')
  if (token === null){
    console.log('NO SATISFIED TOKEN')
    return
  }
  const urlWithToken: string = wsUrl.includes('?') ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`

  ws = new WebSocket(urlWithToken)

  ws.on('open', () => {
    console.log('CLIENT CONNECT SUCCESS')
    ws?.send("PING PING PING")
    maxReConnectTimes = 20

    setInterval(() => {
      if (ws != null && ws.readyState == 1) {
        ws.send('HEART BEAT');
      }
    }, 1000 * 5)

    const mainWindow = BrowserWindow.getFocusedWindow()
    if (mainWindow){
      mainWindow.webContents.send('ws-connected')
    }
  })
  ws.on('close', () => {
    console.log('CONNECTION CLOSE, BUT RECONNECTING RIGHT NOW')
    reconnect()
  })
  ws.on('error', () => {
    console.log('CONNECTION FAIL, BUT RECONNECTING RIGHT NOW');
    reconnect()
  })
  ws.on('message', async (data) => {
    console.log('Received message:', data.toString())
  })

}
