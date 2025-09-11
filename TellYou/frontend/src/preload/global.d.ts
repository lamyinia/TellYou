import { ElectronAPI } from '@electron-toolkit/preload'
import { Session } from '@renderer/status/session/session-class'

declare global {
  interface Window {
    ipcRenderer: Electron.IpcRenderer
    electron: ElectronAPI
    api: unknown
    electronAPI: {
      storeGet: (key: string) => Promise<unknown>
      storeSet: (key: string, value: unknown) => Promise<boolean>
      storeDelete: (key: string) => Promise<boolean>
      storeClear: () => Promise<boolean>
      send: (channel: string, ...args: unknown[]) => void
      on: (channel: string, callback: (...args: unknown[]) => void) => void
      removeListener: (channel: string, callback: (...args: unknown[]) => void) => void

      onWsConnected: (callback: () => void) => void
      offWsConnected: (callback: () => void) => void

      wsSend: (msg: unknown) => Promise<boolean>

      getSessionsWithOrder: () => Promise<unknown[]>
      updateSessionLastMessage: (
        sessionId: string | number,
        content: string,
        time: Date
      ) => Promise<boolean>
      toggleSessionPin: (sessionId: number) => Promise<boolean>
      addSession: (session: Session) => Promise<boolean>
      requestMessages: (
        sessionId: string | number,
        obj: Record<string, unknown>
      ) => Promise<unknown>
    }
  }
  interface ImportMetaEnv {
    readonly VITE_BASE_URL
    readonly VITE_REQUEST_URL
    readonly VITE_REQUEST_WS_URL
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}
