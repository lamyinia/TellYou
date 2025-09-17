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
      storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
      storeDelete: (key: string) => ipcRenderer.invoke('store-delete', key),
      storeClear: () => ipcRenderer.invoke('store-clear'),
      send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
      on: (channel: string, callback: (...args: unknown[]) => void) => ipcRenderer.on(channel, callback),
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => ipcRenderer.removeListener(channel, callback),

      onWsConnected: (callback) => ipcRenderer.on('ws-connected', callback),
      offWsConnected: (callback) => ipcRenderer.removeListener('ws-connected', callback),

      getSessionsWithOrder: () => ipcRenderer.invoke('get-sessions-with-order'),
      updateSessionLastMessage: (sessionId: number, content: string, time: Date) =>
        ipcRenderer.invoke('update-session-last-message', sessionId, content, time),
      toggleSessionPin: (sessionId: number) => ipcRenderer.invoke('toggle-session-pin', sessionId),
      addSession: (session: Session) => ipcRenderer.invoke('add-session', session),
      requestMessages: (sessionId:number, obj:object) => ipcRenderer.invoke('get-message-by-sessionId', sessionId, obj),

      wsSend: (msg: unknown) => ipcRenderer.invoke('ws-send', msg),

      // Avatar cache APIs
      getAvatar: (params: { userId: string; avatarUrl: string; size?: number }) => 
        ipcRenderer.invoke('avatar:get', params),
      preloadAvatars: (params: { avatarMap: Record<string, string>; size?: number }) => 
        ipcRenderer.invoke('avatar:preload', params),
      clearAvatarCache: (userId: string) => 
        ipcRenderer.invoke('avatar:clear', { userId }),
      getAvatarCacheStats: () => 
        ipcRenderer.invoke('avatar:stats')
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
