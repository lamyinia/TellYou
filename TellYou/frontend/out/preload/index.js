"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
window.ipcRenderer = electron.ipcRenderer;
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
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
      addSession: (session) => electron.ipcRenderer.invoke("add-session", session),
      requestMessages: (sessionId, obj) => electron.ipcRenderer.invoke("message:get-by-sessionId", sessionId, obj),
      wsSend: (msg) => electron.ipcRenderer.invoke("websocket:send", msg),
      getNewerAvatar: (params) => electron.ipcRenderer.invoke("avatar:get-newer", params),
      getProfileName: (userId) => electron.ipcRenderer.invoke("profile:name:get", { userId }),
      startMediaTask: (params) => electron.ipcRenderer.invoke("media:send:start", params),
      selectAvatarFile: () => electron.ipcRenderer.invoke("device:select-file"),
      uploadAvatar: (params) => electron.ipcRenderer.invoke("media:avatar:upload", params),
      getAudioStream: (constraints) => electron.ipcRenderer.invoke("device:get-audio-stream", constraints)
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
