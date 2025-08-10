import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import Session = Electron.Session

window.ipcRenderer = ipcRenderer

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)

    contextBridge.exposeInMainWorld('electronAPI', {
      storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
      storeSet: (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
      storeDelete: (key: string) => ipcRenderer.invoke('store-delete', key),
      storeClear: () => ipcRenderer.invoke('store-clear'),
      send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
      onWsConnected: (callback) => ipcRenderer.on('ws-connected', callback),
      offWsConnected: (callback) => ipcRenderer.removeListener('ws-connected', callback),
      // 会话相关的接口
      getSessionsWithOrder: () => ipcRenderer.invoke('get-sessions-with-order'),
      updateSessionLastMessage: (sessionId: number, content: string, time: Date) =>
        ipcRenderer.invoke('update-session-last-message', sessionId, content, time),
      toggleSessionPin: (sessionId: number) => ipcRenderer.invoke('toggle-session-pin', sessionId),
      addSession: (session: Session) => ipcRenderer.invoke('add-session', session),
      getSessionMessages: (sessionId:number, obj:object) => ipcRenderer.invoke('get-session-manager', sessionId, obj)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
