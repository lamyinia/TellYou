import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
      storeClear: () => ipcRenderer.invoke('store-clear')
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
