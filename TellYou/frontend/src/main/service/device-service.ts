import { wsConfigInit } from '@main/websocket/client'
import atomDao from '@main/sqlite/dao/atom-dao'
import { BrowserWindow, ipcMain } from 'electron'
import { test } from '@main/test'
import fs from 'fs'
import path from 'path'
import { mediaUtil } from '@main/util/media-util'

/**
 * 负责监听渲染进程对窗口的变化、请求和关闭窗口等桌面端操作及下游事件
 * @author lanye
 * @date 2025/10/12 15:59
 */


class DeviceService {
  public readonly LOGIN_WIDTH: number = 440
  public readonly LOGIN_HEIGHT: number = 350
  public readonly REGISTER_WIDTH: number = 440
  public readonly REGISTER_HEIGHT: number = 600
  public readonly MAIN_WIDTH: number = 800
  public readonly MAIN_HEIGHT: number = 660

  public beginServe(mainWindow: Electron.BrowserWindow): void {
    ipcMain.handle('device:login-or-register', async (_, goRegister: boolean) => {
      // Ensure window cannot be maximized or resized on login/register screens
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      }
      mainWindow.setMaximizable(false)
      mainWindow.setResizable(true)
      if (goRegister === false) {
        mainWindow.setSize(this.LOGIN_WIDTH, this.LOGIN_HEIGHT)
      } else {
        mainWindow.setSize(this.REGISTER_WIDTH, this.REGISTER_HEIGHT)
      }
      mainWindow.setResizable(false)
      mainWindow.center()
    })
    ipcMain.on('LoginSuccess', (_, userId: string) => {
      wsConfigInit()
      atomDao.initializeUserData(userId).then(() => {
        mainWindow.setResizable(true)
        mainWindow.setSize(920, 740)
        mainWindow.setMaximizable(true)
        mainWindow.setMinimumSize(this.MAIN_WIDTH, this.MAIN_HEIGHT)
        mainWindow.center()
        mainWindow.webContents.send('ws-connected')
      })
    })
    ipcMain.on('window-ChangeScreen', (event, status: number) => {
      const webContents = event.sender
      const win = BrowserWindow.fromWebContents(webContents)

      // if (!win?.isResizable() && status === 1 || status === 2) return

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
    ipcMain.handle('device:select-file', async () => {
      try {
        const { dialog } = await import('electron')
        const result = await dialog.showOpenDialog({
          title: '选择头像文件',
          filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
          properties: ['openFile']
        })
        if (result.canceled || result.filePaths.length === 0) {
          return null
        }
        const filePath = result.filePaths[0]
        const stats = await fs.promises.stat(filePath)
        const maxSize = 10 * 1024 * 1024
        if (stats.size > maxSize) {
          throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`)
        }
        const ext = path.extname(filePath).toLowerCase()
        const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        if (!allowedExts.includes(ext)) {
          throw new Error('只支持 .png, .jpg, .jpeg, .gif, .webp 格式的图片')
        }
        const fileBuffer = await fs.promises.readFile(filePath)
        const base64Data = fileBuffer.toString('base64')
        const dataUrl = `data:${mediaUtil.getMimeTypeBySuffix(ext)};base64,${base64Data}`
        return {
          filePath,
          fileName: path.basename(filePath),
          fileSize: stats.size,
          fileSuffix: ext,
          mimeType: mediaUtil.getMimeTypeBySuffix(ext),
          dataUrl
        }
      } catch (error) {
        console.error('Failed to select avatar file:', error)
        throw error
      }
    })
    ipcMain.handle('test', (_) => {
      test()
    })
  }
}

export const deviceService = new DeviceService()
