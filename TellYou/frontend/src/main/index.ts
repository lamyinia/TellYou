import { app, BrowserWindow, ipcMain, Menu, shell, Tray, protocol } from 'electron'
import fs from 'fs'
import path from 'path'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { instanceId, queryAll, sqliteRun } from './sqlite/atom'
import { initWs, sendText } from '@main/websocket/client'
import { onLoadSessionData, onLoginOrRegister, onLoginSuccess, onScreenChange, onTest } from './ipc-center'
import __Store from 'electron-store'
import { initializeUserData } from '@main/sqlite/dao/local-dao'
import { test } from './test'
import { getMessageBySessionId } from '@main/sqlite/dao/message-dao'
import { avatarCacheService } from './avatar-cache'
// import { mediaTaskService } from './media-service'
import log from 'electron-log'
import os from 'os'

// 辅助函数
const getMimeType = (ext: string): string => {
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

const generateThumbnail = async (filePath: string): Promise<Buffer> => {
  try {
    const sharp = await import('sharp')
    const thumbnailBuffer = await sharp.default(filePath)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer()
    return thumbnailBuffer
  } catch (error) {
    console.error('生成缩略图失败:', error)
    // 如果生成缩略图失败，返回原文件
    return await fs.promises.readFile(filePath)
  }
}

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
// 注册自定义 scheme 为受信任（早于 app.whenReady 推荐在 app.on('ready') 前调用，但此处放在 whenReady 前也能生效）
protocol.registerSchemesAsPrivileged([{ scheme: 'tellyou', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true } }])

app.whenReady().then(() => {
  console.info('TellYou应用启动', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  })

  // 注册自定义协议: tellyou://avatar?path=<absPath> （使用 protocol.handle）
  try {
    // 与 avatar-cache.ts 的逻辑保持一致，实时获取目录
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
        // 统一小写比较并确保以 root 目录 + 分隔符 为前缀，防止相似前缀绕过
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
      webSecurity: false, // 禁用 web 安全限制
      allowRunningInsecureContent: true, // 允许运行不安全内容
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

  // 完全禁用 CSP（仅用于开发环境）
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

  // Avatar cache IPC handlers
  ipcMain.handle('avatar:get', async (_, { userId, avatarUrl, size }) => {
    try {
      const filePath = await avatarCacheService.getAvatar(userId, avatarUrl, size)
      if (!filePath) return null
      // 返回自定义协议地址，避免 file:// 受限
      return `tellyou://avatar?path=${encodeURIComponent(filePath)}`
    } catch (error) {
      console.error('Failed to get avatar:', error)
      return null
    }
  })

  ipcMain.handle('avatar:preload', async (_, { avatarMap, size }) => {
    try {
      await avatarCacheService.preloadAvatars(avatarMap, size)
      return true
    } catch (error) {
      console.error('Failed to preload avatars:', error)
      return false
    }
  })

  ipcMain.handle('avatar:clear', async (_, { userId }) => {
    try {
      avatarCacheService.clearUserCache(userId)
      return true
    } catch (error) {
      console.error('Failed to clear avatar cache:', error)
      return false
    }
  })

  ipcMain.handle('avatar:stats', async () => {
    try {
      return avatarCacheService.getCacheStats()
    } catch (error) {
      console.error('Failed to get avatar cache stats:', error)
      return { totalUsers: 0, totalFiles: 0, totalSize: 0 }
    }
  })

  // Avatar upload IPC handlers
  ipcMain.handle('avatar:select-file', async () => {
    try {
      const { dialog } = await import('electron')
      const result = await dialog.showOpenDialog({
        title: '选择头像文件',
        filters: [
          {
            name: '图片文件',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
          }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const filePath = result.filePaths[0]
      const stats = await fs.promises.stat(filePath)

      // 验证文件大小 (10MB)
      const maxSize = 10 * 1024 * 1024
      if (stats.size > maxSize) {
        throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`)
      }

      // 验证文件扩展名
      const ext = path.extname(filePath).toLowerCase()
      const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
      if (!allowedExts.includes(ext)) {
        throw new Error('只支持 .png, .jpg, .jpeg, .gif, .webp 格式的图片')
      }

      // 读取文件内容并转换为base64
      const fileBuffer = await fs.promises.readFile(filePath)
      const base64Data = fileBuffer.toString('base64')
      const dataUrl = `data:${getMimeType(ext)};base64,${base64Data}`

      return {
        filePath,
        fileName: path.basename(filePath),
        fileSize: stats.size,
        fileSuffix: ext,
        mimeType: getMimeType(ext),
        dataUrl // 添加base64数据URL用于预览
      }
    } catch (error) {
      console.error('Failed to select avatar file:', error)
      throw error
    }
  })

  ipcMain.handle('avatar:upload', async (_, { filePath, fileSize, fileSuffix }) => {
    try {
      const { getUploadUrl, uploadFile, confirmUpload } = await import('./avatar-upload-service')

      console.log('开始上传头像:', { filePath, fileSize, fileSuffix })
      
      const uploadUrls = await getUploadUrl(fileSize, fileSuffix)
      console.log('获取到上传URLs:', uploadUrls)
      
      const originalFileBuffer = await fs.promises.readFile(filePath)
      console.log('读取原始文件完成，大小:', originalFileBuffer.length)
      
      await uploadFile(uploadUrls.originalUploadUrl, originalFileBuffer, getMimeType(fileSuffix))
      console.log('原始文件上传完成')
      
      const thumbnailBuffer = await generateThumbnail(filePath)
      console.log('生成缩略图完成，大小:', thumbnailBuffer.length)
      
      // 缩略图总是JPEG格式
      await uploadFile(uploadUrls.thumbnailUploadUrl, thumbnailBuffer, 'image/jpeg')
      console.log('缩略图上传完成')

      await confirmUpload()
      console.log('确认上传完成')

      return { success: true }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  })
}

