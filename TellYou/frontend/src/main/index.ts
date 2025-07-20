import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createDir, initTable } from './sqlite/SqliteOperation'
import { connectWs, initWs } from './WebSocketClient'
import { onLoginOrRegister, onLoginSuccess } from './IpcCenter'
import __Store from 'electron-store'
const Store = __Store.default || __Store

app.whenReady().then(() => {
  ipcMain.on('ping', () => console.log('pong'))
  createDir()
  initTable()
  initWs()

  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


const loginWidth: number = 596
const loginHeight: number = 400
const registerHeight: number = 462
const store = new Store()

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    icon: icon,
    width: loginWidth,
    height: loginHeight,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    resizable: false,
    maximizable: false,
    frame: true,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: false
    }
  })
  processIpc(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
const processIpc = (mainWindow: Electron.BrowserWindow): void => {
  ipcMain.handle('store-get', (_, key) => {
    return store.get(key)
  })
  ipcMain.handle('store-set', (_, key, value) => {
    store.set(key, value)
    return true
  })
  ipcMain.handle('store-delete', (_, key) => {
    store.delete(key)
    return true
  })
  ipcMain.handle('store-clear', () => {
    store.clear()
    return true
  })

  onLoginOrRegister((isLogin: number) => {
    mainWindow.setResizable(true)
    if (isLogin === 0){
      mainWindow.setSize(loginWidth, loginHeight)
    } else {
      mainWindow.setSize(loginWidth, registerHeight)
    }
    mainWindow.setResizable(false)
  })

  onLoginSuccess(() => {
    mainWindow.setResizable(true)
    mainWindow.setSize(920, 740)
    mainWindow.setMaximizable(true)
    mainWindow.setMinimumSize(800, 600)
    mainWindow.center()
    connectWs()
  })

}


