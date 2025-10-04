import { wsConfigInit } from '@main/websocket/client'
import { initializeUserData } from '@main/sqlite/dao/local-dao'
import { BrowserWindow, ipcMain } from 'electron'
import { test } from '@main/test'

class DeviceService {
  public readonly loginWidth: number = 596
  public readonly loginHeight: number = 400
  public readonly registerWidth: number = 596
  public readonly registerHeight: number = 656

  public beginServe(mainWindow: Electron.BrowserWindow): void {
    ipcMain.on('device:login-or-register', (_, isLogin: boolean) => {
      mainWindow.setResizable(true)
      if (isLogin === false) {
        mainWindow.setSize(this.loginWidth, this.loginHeight)
      } else {
        mainWindow.setSize(this.registerWidth, this.registerHeight)
      }
      mainWindow.setResizable(false)
    })
    ipcMain.on('LoginSuccess', (_, uid: string) => {
      wsConfigInit()
      mainWindow.setResizable(true)
      mainWindow.setSize(920, 740)
      mainWindow.setMaximizable(true)
      mainWindow.setMinimumSize(800, 600)
      mainWindow.center()
      initializeUserData(uid)
    })
    ipcMain.on('window-ChangeScreen', (event, status: number) => {
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
    ipcMain.handle('test', (_) => {
      test()
    })
  }
}

export const deviceService = new DeviceService()
