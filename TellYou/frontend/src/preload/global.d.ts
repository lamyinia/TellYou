import { ElectronAPI } from '@electron-toolkit/preload'
import { Session } from '@renderer/status/session/class'

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

      // Avatar cache APIs
      getAvatar: (params: { userId: string; avatarUrl: string; size?: number }) => Promise<string | null>
      preloadAvatars: (params: { avatarMap: Record<string, string>; size?: number }) => Promise<boolean>
      clearAvatarCache: (userId: string) => Promise<boolean>
      getAvatarCacheStats: () => Promise<{ totalUsers: number; totalFiles: number; totalSize: number }>
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
