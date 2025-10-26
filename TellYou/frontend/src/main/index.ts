import { app, BrowserWindow, Menu, protocol, shell, Tray } from 'electron'
import { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '@shared/resources/icon.png?asset'
import __Store from 'electron-store'
import log from 'electron-log'
import os from 'os'
import { mediaTaskService } from '@main/service/media-service'
import { jsonStoreService } from '@main/service/json-store-service'
import { applicationService } from '@main/service/application-service'
import { blackService } from '@main/service/black-service'
import { messageService } from '@main/service/message-service'
import { sessionService } from '@main/service/session-service'
import { deviceService } from '@main/service/device-service'
import { avatarCache } from '@main/cache/avatar-cache'
import urlUtil from '@main/util/url-util'
import proxyService from '@main/service/proxy-service'
import voiceCache from '@main/cache/voice-cache'
import imageCache from '@main/cache/image-cache'
import videoCache from '@main/cache/video-cache'
import fileCache from '@main/cache/file-cache'

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

app.setPath('userData', app.getPath('userData') + '_' + urlUtil.instanceId)
protocol.registerSchemesAsPrivileged([{
    scheme: 'tellyou',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
])
export const store = new Store()
const contextMenu = [
  {
    label: '退出TellYou',
    click: () => {
      app.exit()
    }
  }
]
const menu = Menu.buildFromTemplate(contextMenu)

app.whenReady().then(() => {
  console.info('TellYou应用启动', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  })
  urlUtil.init()
  urlUtil.registerProtocol()
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

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    icon: icon,
    width: deviceService.LOGIN_WIDTH,
    height: deviceService.LOGIN_HEIGHT,
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

  proxyService.beginServe()
  avatarCache.beginServe()
  voiceCache.beginServe()
  imageCache.beginServe()
  videoCache.beginServe()
  fileCache.beginServe()
  mediaTaskService.beginServe()
  jsonStoreService.beginServe()
  sessionService.beginServe()
  messageService.beginServe()
  applicationService.beginServe()
  blackService.beginServer()
  deviceService.beginServe(mainWindow)

  mainWindow.on('ready-to-show', () => {
    // Re-enforce login screen window constraints at startup
    mainWindow.setResizable(false)
    mainWindow.setMaximizable(false)
    mainWindow.show()
    mainWindow.center()
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
          'Content-Security-Policy': [
            "default-src * 'unsafe-eval' 'unsafe-inline' data: blob: file:"
          ]
        }
      })
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']).then()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).then()
  }
}
