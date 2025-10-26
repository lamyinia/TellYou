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
    // 获取音频流 - 使用Electron原生API替代浏览器API
    ipcMain.handle('device:get-audio-stream', async (_, constraints) => {
      try {
        console.log('开始获取音频流，约束条件:', constraints)
        // 返回音频约束配置，让渲染进程使用getUserMedia
        // 针对语音通话优化，减少文件大小
        return {
          success: true,
          constraints: {
            audio: {
              echoCancellation: constraints?.audio?.echoCancellation ?? true,
              noiseSuppression: constraints?.audio?.noiseSuppression ?? true,
              autoGainControl: constraints?.audio?.autoGainControl ?? true,
              // 优化音频参数以减少文件大小
              sampleRate: constraints?.audio?.sampleRate ?? 16000,  // 降低到16kHz（语音质量足够）
              channelCount: constraints?.audio?.channelCount ?? 1,   // 单声道
              sampleSize: constraints?.audio?.sampleSize ?? 16,      // 16位采样
              // 添加比特率限制（如果浏览器支持）
              bitrate: constraints?.audio?.bitrate ?? 32000,        // 32kbps比特率
              // 音频编码优化
              latency: 0.01,  // 低延迟
              volume: 1.0     // 音量
            }
          },
          // 提供特殊标识，表明这是通过Electron主进程验证的
          electronVerified: true,
          // 添加录音建议配置
          recordingOptions: {
            mimeType: 'audio/webm;codecs=opus',  // 使用Opus编解码器
            audioBitsPerSecond: 128000            // 32kbps比特率
          }
        }
      } catch (error) {
        console.error('获取音频流失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    })

    // 生成文件预览图
    ipcMain.handle('file:generate-preview', async (_, filePath: string) => {
      try {
        const path = require('path')
        const ext = path.extname(filePath).toLowerCase()

        console.log('生成文件预览图:', filePath, '扩展名:', ext)

        switch (ext) {
          case '.pdf':
            return await this.generatePdfPreview(filePath)
          case '.docx':
          case '.doc':
            return await this.generateDocPreview(filePath)
          case '.xlsx':
          case '.xls':
            return await this.generateExcelPreview(filePath)
          case '.pptx':
          case '.ppt':
            return await this.generatePptPreview(filePath)
          case '.txt':
            return await this.generateTextPreview(filePath)
          default:
            console.log('不支持的文件类型:', ext)
            return null
        }
      } catch (error) {
        console.error('生成文件预览图失败:', error)
        return null
      }
    })

    // 处理视频文件转blob的请求
    ipcMain.handle('video:convert-to-blob', async (_, filePath: string) => {
      try {
        console.log('转换视频文件为blob:', filePath)
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
          throw new Error(`文件不存在: ${filePath}`)
        }
        
        // 读取文件内容
        const fileBuffer = fs.readFileSync(filePath)
        
        // 获取文件扩展名来确定MIME类型
        const ext = path.extname(filePath).toLowerCase()
        let mimeType = 'video/mp4' // 默认
        
        switch (ext) {
          case '.mp4':
            mimeType = 'video/mp4'
            break
          case '.webm':
            mimeType = 'video/webm'
            break
          case '.ogg':
            mimeType = 'video/ogg'
            break
          case '.avi':
            mimeType = 'video/x-msvideo'
            break
          case '.mov':
            mimeType = 'video/quicktime'
            break
          default:
            mimeType = 'video/mp4'
        }
        
        // 转换为base64，前端可以用来创建blob URL
        const base64Data = fileBuffer.toString('base64')
        const dataUrl = `data:${mimeType};base64,${base64Data}`
        
        console.log('视频文件转换成功，大小:', fileBuffer.length, 'bytes')
        return {
          success: true,
          dataUrl,
          mimeType,
          size: fileBuffer.length
        }
        
      } catch (error) {
        console.error('视频文件转blob失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })

    ipcMain.handle('test', (_, data: any) => {
      test(data)
    })
  }

  // PDF 预览图生成
  private async generatePdfPreview(filePath: string): Promise<string | null> {
    try {
      // 这里可以使用 pdf-poppler 或其他 PDF 处理库
      // 返回 Base64 编码的预览图
      console.log('生成 PDF 预览图:', filePath)
      // 暂时返回 null，表示不支持
      return null
    } catch (error) {
      console.error('PDF 预览图生成失败:', error)
      return null
    }
  }

  // Word 文档预览图生成
  private async generateDocPreview(filePath: string): Promise<string | null> {
    try {
      console.log('生成 Word 预览图:', filePath)
      // 暂时返回 null，表示不支持
      return null
    } catch (error) {
      console.error('Word 预览图生成失败:', error)
      return null
    }
  }

  // Excel 预览图生成
  private async generateExcelPreview(filePath: string): Promise<string | null> {
    try {
      console.log('生成 Excel 预览图:', filePath)
      // 暂时返回 null，表示不支持
      return null
    } catch (error) {
      console.error('Excel 预览图生成失败:', error)
      return null
    }
  }

  // PowerPoint 预览图生成
  private async generatePptPreview(filePath: string): Promise<string | null> {
    try {
      console.log('生成 PowerPoint 预览图:', filePath)
      // 暂时返回 null，表示不支持
      return null
    } catch (error) {
      console.error('PowerPoint 预览图生成失败:', error)
      return null
    }
  }

  // 文本文件预览图生成
  private async generateTextPreview(filePath: string): Promise<string | null> {
    try {
      const fs = require('fs')
      const content = fs.readFileSync(filePath, 'utf-8')
      // 截取前 500 个字符作为预览
      const preview = content.substring(0, 500)
      console.log('生成文本预览:', preview.substring(0, 50) + '...')
      return preview
    } catch (error) {
      console.error('文本预览生成失败:', error)
      return null
    }
  }
}

export const deviceService = new DeviceService()
