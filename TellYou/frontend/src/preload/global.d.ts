import { ElectronAPI } from "@electron-toolkit/preload";
import { Session } from "@renderer/status/session/class";

declare global {
  interface Window {
    ipcRenderer: Electron.IpcRenderer;
    electron: ElectronAPI;
    api: unknown;
    electronAPI: {
      storeGet: (key: string) => Promise<unknown>;
      storeSet: (key: string, value: unknown) => Promise<boolean>;
      storeDelete: (key: string) => Promise<boolean>;
      storeClear: () => Promise<boolean>;
      invoke: (channel: string, ...args: unknown[]) => Promise<any>;
      send: (channel: string, ...args: unknown[]) => void;
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (
        channel: string,
        callback: (...args: unknown[]) => void,
      ) => void;
      onWsConnected: (callback: () => void) => void;
      offWsConnected: (callback: () => void) => void;
      onMainInitialized: (callback: () => void) => void;
      offMainInitialized: (callback: () => void) => void;
      wsSend: (msg: unknown) => Promise<boolean>;
      addSession: (session: Session) => Promise<boolean>;
      requestMessages: (
        sessionId: string | number,
        obj: Record<string, unknown>,
      ) => Promise<unknown>;
      getNewerAvatar: (params: {
        userId: string;
        strategy: string;
        avatarUrl: string;
      }) => Promise<string | null>;
      startMediaTask: (params: {
        type: string;
        filePath: string;
        fileName: string;
        mimeType: string;
      }) => Promise<{ taskId: string; success: boolean; error?: string }>;

      getProfileName: (userId: string) => Promise<any>;

      selectAvatarFile: () => Promise<{
        filePath: string;
        fileName: string;
        fileSize: number;
        fileSuffix: string;
        mimeType: string;
        dataUrl: string;
      } | null>;
      uploadAvatar: (params: {
        filePath: string;
        fileName: string;
        fileSize: number;
        fileSuffix: string;
      }) => Promise<{ success: boolean }>;
      getAudioStream: (constraints: any) => Promise<{
        success: boolean;
        constraints?: any;
        electronVerified?: boolean;
        error?: string;
      }>;
    };
  }

  interface ImportMetaEnv {
    readonly VITE_BASE_URL;
    readonly VITE_REQUEST_URL;
    readonly VITE_REQUEST_WS_URL;
    readonly VITE_REQUEST_OBJECT_ATOM;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
