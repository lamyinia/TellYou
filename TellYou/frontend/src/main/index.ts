import { app, BrowserWindow, ipcMain, Menu, protocol, shell, Tray } from 'electron'
import fs from 'fs'
import path, { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { instanceId, queryAll, sqliteRun } from './sqlite/atom'
import { sendText, wsConfigInit } from '@main/websocket/client'
import { onLoadSessionData, onLoginOrRegister, onLoginSuccess, onScreenChange, onTest } from './ipc-center'
import __Store from 'electron-store'
import { initializeUserData } from '@main/sqlite/dao/local-dao'
import { test } from './test'
import { getMessageBySessionId } from '@main/sqlite/dao/message-dao'
import log from 'electron-log'
import os from 'os'
import { MediaTaskService } from '@main/service/media-service'

let _mediaService: MediaTaskService|null = null
const Store = (__Store as any).default || __Store
log.transports.file.level = 'debug'
log.transports.file.maxSize = 1002430
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'
log.transports.file.resolvePathFn = () => join(os.homedir(), '.tellyou', 'logs', 'main.log')
console.log = log.log
console.warn = log.warn
console.error = log.error
console.info = log.info
console.debug = log.debug

app.setPath('userData', app.getPath('userData') + '_' + instanceId)
protocol.registerSchemesAsPrivileged([{ scheme: 'tellyou', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }])

app.whenReady().then(() => {
  console.info('TellYou应用启动', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  })

  try {
    const getCacheRoot = () => join(app.getPath('userData'), '.tellyou', 'cache', 'avatar')
    const mimeByExt: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif'
    }
    protocol.handle('tellyou', async (request) => {
      try {
        const url = new URL(request.url)
        if (url.hostname !== 'avatar') return new Response('', { status: 403 })
        const filePath = decodeURIComponent(url.searchParams.get('path') || '')
        const normalized = path.resolve(filePath)
        const rootResolved = path.resolve(getCacheRoot())
        const hasAccess = normalized.toLowerCase().startsWith((rootResolved + path.sep).toLowerCase())
          || normalized.toLowerCase() === rootResolved.toLowerCase()

        if (!hasAccess) {
          console.error('tellyou protocol denied:', { normalized, rootResolved })
          return new Response('', { status: 403 })
        }

        const ext = path.extname(normalized).toLowerCase()
        const mime = mimeByExt[ext] || 'application/octet-stream'
        const data = await fs.promises.readFile(normalized)
        return new Response(data, { headers: { 'content-type': mime, 'Access-Control-Allow-Origin': '*' } })
      } catch (e) {
        console.error('tellyou protocol error:', e)
        return new Response('', { status: 500 })
      }
    })
  } catch (e) {
    console.error('register protocol failed', e)
  }

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

const createWindow = (): void => {
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
      contextIsolation: true,
      experimentalFeatures: true
    }
  })
  const tray = new Tray(icon)
  tray.setTitle('TellYou')
  tray.setContextMenu(menu)
  tray.on('click', () => {
    mainWindow.setSkipTaskbar(false)
    mainWindow.show()
  })

  _mediaService = new MediaTaskService()
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

  if (is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ['default-src * \'unsafe-eval\' \'unsafe-inline\' data: blob: file:']
        }
      })
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const processIpc = (mainWindow: Electron.BrowserWindow): void => {
  dataHandle()
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
    wsConfigInit()
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

const dataHandle = (): void => {
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
      return true
    } catch (error) {
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
  // application IPC
  ipcMain.on('application:incoming:load', async (event, { pageNo, pageSize }) => {
    const { loadIncomingApplications } = await import('@main/sqlite/dao/application-dao')
    const data = await loadIncomingApplications(pageNo, pageSize)
    event.sender.send('application:incoming:loaded', data)
  })
  ipcMain.on('application:outgoing:load', async (event, { pageNo, pageSize }) => {
    const { loadOutgoingApplications } = await import('@main/sqlite/dao/application-dao')
    const data = await loadOutgoingApplications(pageNo, pageSize)
    event.sender.send('application:outgoing:loaded', data)
  })
  ipcMain.on('application:incoming:approve', async (event, { ids }) => {
    const { approveIncoming } = await import('@main/sqlite/dao/application-dao')
    await approveIncoming(ids || [])
  })
  ipcMain.on('application:incoming:reject', async (event, { ids }) => {
    const { rejectIncoming } = await import('@main/sqlite/dao/application-dao')
    await rejectIncoming(ids || [])
  })
  ipcMain.on('application:outgoing:cancel', async (event, { ids }) => {
    const { cancelOutgoing } = await import('@main/sqlite/dao/application-dao')
    await cancelOutgoing(ids || [])
  })
  ipcMain.on('application:send', async (event, { toUserId, remark }) => {
    const { insertApplication } = await import('@main/sqlite/dao/application-dao')
    // TODO: 当前登录用户ID从 store 获取，这里先置空或从全局配置读取
    await insertApplication('', toUserId, remark)
  })

  ipcMain.on('black:list:load', async (event, { pageNo, pageSize }) => {
    const { loadBlacklist } = await import('@main/sqlite/dao/black-dao')
    const data = await loadBlacklist(pageNo, pageSize)
    event.sender.send('black:list:loaded', data)
  })
  ipcMain.on('black:list:remove', async (event, { userIds }) => {
    const { removeFromBlacklist } = await import('@main/sqlite/dao/black-dao')
    await removeFromBlacklist(userIds || [])
  })
}

