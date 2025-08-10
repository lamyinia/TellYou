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
      storeClear: () => electron.ipcRenderer.invoke("store-clear"),
      send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
      onWsConnected: (callback) => electron.ipcRenderer.on("ws-connected", callback),
      offWsConnected: (callback) => electron.ipcRenderer.removeListener("ws-connected", callback),
      // 会话相关的接口
      getSessionsWithOrder: () => electron.ipcRenderer.invoke("get-sessions-with-order"),
      updateSessionLastMessage: (sessionId, content, time) => electron.ipcRenderer.invoke("update-session-last-message", sessionId, content, time),
      toggleSessionPin: (sessionId) => electron.ipcRenderer.invoke("toggle-session-pin", sessionId),
      addSession: (session) => electron.ipcRenderer.invoke("add-session", session),
      getSessionMessages: (sessionId, obj) => electron.ipcRenderer.invoke("get-session-manager", sessionId, obj)
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
