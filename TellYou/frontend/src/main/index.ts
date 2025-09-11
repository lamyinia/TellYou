import { app, BrowserWindow, ipcMain, Menu, shell, Tray } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { instanceId, queryAll, sqliteRun } from './sqlite/sqlite-operation'
import { initWs, sendText } from './client/websocket-client'
import { onLoadSessionData, onLoginOrRegister, onLoginSuccess, onScreenChange, onTest } from './ipc-center'
import __Store from 'electron-store'
import { initializeUserData } from '@main/sqlite/dao/local-dao'
import { logger, LogLevel } from '../utils/log-util'
import { test } from './test'
import { getMessageBySessionId } from '@main/sqlite/dao/message-dao'

const Store = __Store.default || __Store

app.setPath('userData', app.getPath('userData') + '_' + instanceId)
app.whenReady().then(() => {
  if (process.env.NODE_ENV === 'development') {
    logger.setLevel(LogLevel.DEBUG)
  } else {
    logger.setLevel(LogLevel.INFO)
  }
  logger.info('TellYou应用启动', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  })

  initWs()
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
  app.on('activate', function() {
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
const registerWidth: number = 596
const registerHeight: number = 462
export const store = new Store()
const contextMenu = [
  {
    label: '退出TellYou', click: () => {
      app.exit()
    }
  }
]
const menu = Menu.buildFromTemplate(contextMenu)

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
      contextIsolation: true
    }
  })
  const tray = new Tray(icon)
  tray.setTitle('TellYou')
  tray.setContextMenu(menu)
  tray.on('click', () => {
    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
  })

  processIpc(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'detach', title: 'devTool', activate: false })
      mainWindow.focus()
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
  invokeHandle()

  onLoadSessionData()

  onLoginOrRegister((isLogin: number) => {
    mainWindow.setResizable(true)
    if (isLogin === 0) {
      mainWindow.setSize(loginWidth, loginHeight)
    } else {
      mainWindow.setSize(registerWidth, registerHeight)
    }
    mainWindow.setResizable(false)
  })

  onLoginSuccess((uid: string) => {
    mainWindow.setResizable(true)
    mainWindow.setSize(920, 740)
    mainWindow.setMaximizable(true)
    mainWindow.setMinimumSize(800, 600)
    mainWindow.center()

    initializeUserData(uid)
  })

  onScreenChange((event: Electron.IpcMainEvent, status: number) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    switch (status) {
      case 0:
        if (win?.isAlwaysOnTop()) {
          win?.setAlwaysOnTop(false)
        } else {
          win?.setAlwaysOnTop(true)
        }
        break
      case 1:
        win?.minimize()
        break
      case 2:
        if (win?.isMaximized()) {
          win?.unmaximize()
        } else {
          win?.maximize()
        }
        break
      case 3:
        win?.setSkipTaskbar(true)
        win?.hide()
        break
    }
  })

  onTest(() => {
    test()
  })
}

const invokeHandle = ():void => {
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

  ipcMain.handle('ws-send', async (_, msg) => {
    console.log(msg)
    try {
      sendText(msg)
      console.log('发送成功')
      return true;
    } catch (error){
      console.error('发送消息失败:', error)
      return false
    }
  })

  ipcMain.handle('get-sessions-with-order', async () => {
    try {
      const sql = `
        SELECT *
        FROM sessions
        WHERE contact_type IN (1, 2)
        ORDER BY is_pinned DESC, last_msg_time DESC
      `
      const result = await queryAll(sql, [])
      return result
    } catch (error) {
      console.error('获取会话列表失败:', error)
      return []
    }
  })
  ipcMain.handle('update-session-last-message', async (_, sessionId: string | number, content: string, time: Date) => {
    try {
      const sql = `
        UPDATE sessions
        SET last_msg_content = ?,
            last_msg_time    = ?,
            updated_at       = ?
        WHERE session_id = ?
      `
      const result = await sqliteRun(sql, [content, time.toISOString(), new Date().toISOString(), String(sessionId)])
      return result > 0
    } catch (error) {
      console.error('更新会话最后消息失败:', error)
      return false
    }
  })
  ipcMain.handle('toggle-session-pin', async (_, sessionId: string | number) => {
    try {
      const sql = `
        UPDATE sessions
        SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END
        WHERE session_id = ?
      `
      const result = await sqliteRun(sql, [String(sessionId)])
      return result > 0
    } catch (error) {
      console.error('切换置顶状态失败:', error)
      return false
    }
  })
  ipcMain.handle('get-message-by-sessionId', (_, sessionId: string | number, options: any) => {
    return getMessageBySessionId(String(sessionId), options)
  })
}

