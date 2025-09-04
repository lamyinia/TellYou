import { app, BrowserWindow, ipcMain, Menu, shell, Tray } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { instanceId, queryAll, sqliteRun } from './sqlite/sqlite-operation'
import { initWs } from './websocket-client'
import { onLoadSessionData, onLoginOrRegister, onLoginSuccess, onScreenChange, onTest } from './ipc-center'
import __Store from 'electron-store'
import { initializeUserData } from '@main/sqlite/dao/local-dao'
import { logger, LogLevel } from '../utils/log-util'
import { test } from './test'

const Store = __Store.default || __Store


/************************************************** app 生命周期 *************************************************************/
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

/************************************************** app 构建逻辑 *************************************************************/
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
  ipcMain.handle('update-session-last-message', async (_, sessionId: number, content: string, time: Date) => {
    try {
      const sql = `
        UPDATE sessions
        SET last_msg_content = ?,
            last_msg_time    = ?,
            updated_at       = ?
        WHERE session_id = ?
      `
      const result = await sqliteRun(sql, [content, time.toISOString(), new Date().toISOString(), sessionId])
      return result > 0
    } catch (error) {
      console.error('更新会话最后消息失败:', error)
      return false
    }
  })
  ipcMain.handle('toggle-session-pin', async (_, sessionId: number) => {
    try {
      const sql = `
        UPDATE sessions
        SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END
        WHERE session_id = ?
      `
      const result = await sqliteRun(sql, [sessionId])
      return result > 0
    } catch (error) {
      console.error('切换置顶状态失败:', error)
      return false
    }
  })
  ipcMain.handle('get-message-by-sessionId', async (_, sessionId: number, options: any) => {
    try {
      const limit = Math.max(1, Math.min(Number(options?.limit) || 50, 200))
      const direction: 'newest' | 'older' | 'newer' = (options?.direction || 'newest')
      const beforeId: number | undefined = options?.beforeId
      const afterId: number | undefined = options?.afterId

      let where = 'WHERE session_id = ?'
      const params: any[] = [sessionId]

      if (direction === 'older' && beforeId) {
        where += ' AND id < ?'
        params.push(beforeId)
      }
      if (direction === 'newer' && afterId) {
        where += ' AND id > ?'
        params.push(afterId)
      }

      const sql = `
        SELECT id, session_id, sequence_id, sender_id, sender_name, msg_type, is_recalled,
               text, ext_data, send_time, is_read
        FROM messages
        ${where}
        ORDER BY send_time DESC, id DESC
        LIMIT ${limit}
      `

      const rows = await queryAll(sql, params)

      const messages = (rows as any[]).map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        content: r.text ?? '',
        messageType: ((): 'text' | 'image' | 'file' | 'system' => {
          switch (r.msgType) {
            case 1: return 'text'
            case 2: return 'image'
            case 5: return 'file'
            default: return 'system'
          }
        })(),
        senderId: r.senderId,
        senderName: r.senderName || '',
        senderAvatar: '',
        timestamp: new Date(r.sendTime),
        isRead: !!r.isRead
      }))

      const totalCountRow = await queryAll('SELECT COUNT(1) as total FROM messages WHERE session_id = ?', [sessionId])
      const totalCount = (totalCountRow[0] as any)?.total || 0

      let hasMore = false
      if (messages.length > 0) {
        const lastId = messages[messages.length - 1].id
        const moreRow = await queryAll('SELECT COUNT(1) as cnt FROM messages WHERE session_id = ? AND id < ?', [sessionId, lastId])
        hasMore = ((moreRow[0] as any)?.cnt || 0) > 0
      }

      return { messages, hasMore, totalCount }
    } catch (error) {
      console.error('获取会话消息失败:', error)
      return { messages: [], hasMore: false, totalCount: 0 }
    }
  })
}

