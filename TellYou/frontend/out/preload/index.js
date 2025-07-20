"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
window.ipcRenderer = electron.ipcRenderer;
const api = {};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
    electron.contextBridge.exposeInMainWorld("electronAPI", {
      storeGet: (key) => electron.ipcRenderer.invoke("store-get", key),
      storeSet: (key, value) => electron.ipcRenderer.invoke("store-set", key, value),
      storeDelete: (key) => electron.ipcRenderer.invoke("store-delete", key),
      storeClear: () => electron.ipcRenderer.invoke("store-clear")
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
