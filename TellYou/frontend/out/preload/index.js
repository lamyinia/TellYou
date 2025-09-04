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
      on: (channel, callback) => electron.ipcRenderer.on(channel, callback),
      removeListener: (channel, callback) => electron.ipcRenderer.removeListener(channel, callback),
      onWsConnected: (callback) => electron.ipcRenderer.on("ws-connected", callback),
      offWsConnected: (callback) => electron.ipcRenderer.removeListener("ws-connected", callback),
      getSessionsWithOrder: () => electron.ipcRenderer.invoke("get-sessions-with-order"),
      updateSessionLastMessage: (sessionId, content, time) => electron.ipcRenderer.invoke("update-session-last-message", sessionId, content, time),
      toggleSessionPin: (sessionId) => electron.ipcRenderer.invoke("toggle-session-pin", sessionId),
      addSession: (session) => electron.ipcRenderer.invoke("add-session", session),
      requestMessages: (sessionId, obj) => electron.ipcRenderer.invoke("get-message-by-sessionId", sessionId, obj)
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
