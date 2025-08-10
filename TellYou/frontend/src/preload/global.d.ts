import { ElectronAPI } from '@electron-toolkit/preload'
import { Session } from '@renderer/store/session/session-class'

declare global {
  interface Window {
    ipcRenderer: Electron.IpcRenderer
    electron: ElectronAPI
    api: unknown
    electronAPI: {
      storeGet: (key: string) => Promise<any>
      storeSet: (key: string, value: any) => Promise<boolean>
      storeDelete: (key: string) => Promise<boolean>
      storeClear: () => Promise<boolean>
      send: (channel: string, ...args: any[]) => Promise<any>
      onWsConnected: (callback: ()=>void) => Promise<any>
      offWsConnected: (callback: ()=>void) => Promise<any>
      // 会话相关的接口
      getSessionsWithOrder: () => Promise<any[]>
      updateSessionLastMessage: (sessionId: number, content: string, time: Date) => Promise<boolean>
      toggleSessionPin: (sessionId: number) => Promise<boolean>
      addSession: (session: Session) => Promise<boolean>
      getSessionMessages: (sessionId: number, obj: any) => Promise<any>
    }
  }
  interface ImportMetaEnv {
    readonly VITE_BASE_URL,
    readonly VITE_REQUEST_URL,
    readonly VITE_REQUEST_WS_URL
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
