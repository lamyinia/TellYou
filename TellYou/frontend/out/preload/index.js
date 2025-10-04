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
      invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args),
      send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
      on: (channel, callback) => electron.ipcRenderer.on(channel, callback),
      removeListener: (channel, callback) => electron.ipcRenderer.removeListener(channel, callback),
      onWsConnected: (callback) => electron.ipcRenderer.on("ws-connected", callback),
      offWsConnected: (callback) => electron.ipcRenderer.removeListener("ws-connected", callback),
      getSessionsWithOrder: () => electron.ipcRenderer.invoke("get-sessions-with-order"),
      updateSessionLastMessage: (sessionId, content, time) => electron.ipcRenderer.invoke("update-session-last-message", sessionId, content, time),
      toggleSessionPin: (sessionId) => electron.ipcRenderer.invoke("toggle-session-pin", sessionId),
      addSession: (session) => electron.ipcRenderer.invoke("add-session", session),
      requestMessages: (sessionId, obj) => electron.ipcRenderer.invoke("message:get-by-sessionId", sessionId, obj),
      wsSend: (msg) => electron.ipcRenderer.invoke("websocket:send", msg),
      getAvatar: (params) => electron.ipcRenderer.invoke("avatar:get", params),
      preloadAvatars: (params) => electron.ipcRenderer.invoke("avatar:preload", params),
      clearAvatarCache: (userId) => electron.ipcRenderer.invoke("avatar:clear", { userId }),
      getAvatarCacheStats: () => electron.ipcRenderer.invoke("avatar:stats"),
      startMediaTask: (params) => electron.ipcRenderer.invoke("media:send:start", params),
      cancelMediaTask: (taskId) => electron.ipcRenderer.invoke("media:send:cancel", taskId),
      retryMediaTask: (taskId) => electron.ipcRenderer.invoke("media:send:retry", taskId),
      getMediaTaskStatus: (taskId) => electron.ipcRenderer.invoke("media:send:status", taskId),
      getAllMediaTasks: () => electron.ipcRenderer.invoke("media:send:list"),
      selectAvatarFile: () => electron.ipcRenderer.invoke("avatar:select-file"),
      uploadAvatar: (params) => electron.ipcRenderer.invoke("avatar:upload", params)
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
