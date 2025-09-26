import { app, BrowserWindow, Menu, protocol, shell, Tray } from 'electron'
import fs from 'fs'
import path, { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { instanceId } from './sqlite/atom'
import __Store from 'electron-store'
import log from 'electron-log'
import os from 'os'
import { mediaTaskService } from '@main/service/media-service'
import { jsonStoreService } from '@main/service/json-store-service'
import { applicationService } from '@main/service/application-service'
import { blackService } from '@main/service/black-service'
import { messageService } from '@main/service/message-service'
import { sessionService } from '@main/service/session-service'
import { listenService } from '@main/service/listen-service'

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

export const store = new Store()
const contextMenu = [
  {
    label: '退出TellYou', click: () => {
      app.exit()
    }
  }
]
const menu = Menu.buildFromTemplate(contextMenu)

app.setPath('userData', app.getPath('userData') + '_' + instanceId)
protocol.registerSchemesAsPrivileged([{
  scheme: 'tellyou',
  privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true }
}])
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

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    icon: icon,
    width: listenService.loginWidth,
    height: listenService.loginHeight,
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

  mediaTaskService.beginServe()
  jsonStoreService.beginServe()
  sessionService.beginServe()
  messageService.beginServe()
  applicationService.beginServe()
  blackService.beginServer()
  listenService.beginServe(mainWindow)

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
