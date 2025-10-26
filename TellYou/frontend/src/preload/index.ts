import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import Session = Electron.Session

window.ipcRenderer = ipcRenderer

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', {
      storeGet: (key: string) => ipcRenderer.invoke('store-get', key),
      storeSet: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
      storeDelete: (key: string) => ipcRenderer.invoke('store-delete', key),
      storeClear: () => ipcRenderer.invoke('store-clear'),
      invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
      send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
      on: (channel: string, callback: (...args: unknown[]) => void) => ipcRenderer.on(channel, callback),
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => ipcRenderer.removeListener(channel, callback),
      onWsConnected: (callback) => ipcRenderer.on('ws-connected', callback),
      offWsConnected: (callback) => ipcRenderer.removeListener('ws-connected', callback),
      addSession: (session: Session) => ipcRenderer.invoke('add-session', session),
      requestMessages: (sessionId: number, obj: object) => ipcRenderer.invoke('message:get-by-sessionId', sessionId, obj),
      wsSend: (msg: unknown) => ipcRenderer.invoke('websocket:send', msg),

      getNewerAvatar: (params: { userId: string; strategy: string; avatarUrl: string }) => ipcRenderer.invoke('avatar:get-newer', params),
      getProfileName: (userId: string) => ipcRenderer.invoke('profile:name:get', { userId }),
      startMediaTask: (params: { type: string, filePath: string, fileName: string, mimeType: string }) => ipcRenderer.invoke('media:send:start', params),
      selectAvatarFile: () => ipcRenderer.invoke('device:select-file'),
      uploadAvatar: (params: { filePath: string, fileName: string, fileSize: number, fileSuffix: string }) => ipcRenderer.invoke('media:avatar:upload', params),
      getAudioStream: (constraints: any) => ipcRenderer.invoke('device:get-audio-stream', constraints)
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
