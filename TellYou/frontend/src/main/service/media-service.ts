import { app, ipcMain } from 'electron'
import path, { join } from 'path'
import fs, { createReadStream, existsSync, mkdirSync, statSync } from 'fs'
import axios from 'axios'
import log from 'electron-log'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

export enum MediaTaskStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file'
}

export interface MediaTask {
  id: string
  type: MediaType
  filePath: string
  fileName: string
  fileSize: number
  mimeType: string
  status: MediaTaskStatus
  progress: number
  error?: string
  uploadUrls?: {
    origin: string
    thumbnail?: string
  }
  result?: {
    originUrl: string
    thumbnailUrl?: string
    fileId: string
  }
  createdAt: number
  updatedAt: number
  chunkCursor?: number // 分块上传游标
}

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
    return await fs.promises.readFile(filePath)
  }
}

class MediaTaskService {
  private tasks = new Map<string, MediaTask>()
  private tempDir: string = ""
  private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB 分块
  private readonly MAX_CONCURRENT = 3 // 最大并发上传数
  private readonly RETRY_TIMES = 3 // 重试次数

  public beginServe(): void {
    ffmpeg.setFfmpegPath(ffmpegStatic as string)

    this.tempDir = join(app.getPath('userData'), '.tellyou', 'media', 'temp')
    this.ensureTempDir()
    this.setupIpcHandlers()
  }

  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('media:send:start', async (event, params: {
      type: MediaType
      filePath: string
      fileName: string
      mimeType: string
    }) => {
      return this.startTask(params)
    })
    ipcMain.handle('media:send:cancel', async (event, taskId: string) => {
      return this.cancelTask(taskId)
    })
    ipcMain.handle('media:send:retry', async (event, taskId: string) => {
      return this.retryTask(taskId)
    })
    ipcMain.handle('media:send:status', async (event, taskId: string) => {
      return this.getTaskStatus(taskId)
    })
    ipcMain.handle('media:send:list', async () => {
      return this.getAllTasks()
    })
    ipcMain.handle('avatar:select-file', async () => {
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
        const dataUrl = `data:${getMimeType(ext)};base64,${base64Data}`
        return {
          filePath,
          fileName: path.basename(filePath),
          fileSize: stats.size,
          fileSuffix: ext,
          mimeType: getMimeType(ext),
          dataUrl
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
        const originalFileBuffer = await fs.promises.readFile(filePath)
        const thumbnailBuffer = await generateThumbnail(filePath)
        await uploadFile(uploadUrls.originalUploadUrl, originalFileBuffer, getMimeType(fileSuffix))
        await uploadFile(uploadUrls.thumbnailUploadUrl, thumbnailBuffer, 'image/jpeg')
        await confirmUpload()
        console.log('确认上传完成头像URL:', uploadUrls.originalUploadUrl)
        return {
          success: true,
          avatarUrl: uploadUrls.originalUploadUrl.split('?')[0]
        }
      } catch (error) {
        console.error('Failed to upload avatar:', error)
        throw error
      }
    })
  }

  async startTask(params: {
    type: MediaType
    filePath: string
    fileName: string
    mimeType: string
  }): Promise<{ taskId: string; success: boolean; error?: string }> {
    try {
      const taskId = this.generateTaskId()
      const fileStats = statSync(params.filePath)
      const task: MediaTask = {
        id: taskId,
        type: params.type,
        filePath: params.filePath,
        fileName: params.fileName,
        fileSize: fileStats.size,
        mimeType: params.mimeType,
        status: MediaTaskStatus.PENDING,
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      this.tasks.set(taskId, task)
      this.processTask(taskId).catch(err => {
        log.error('Media task processing failed:', err)
      })

      return { taskId, success: true }
    } catch (error) {
      log.error('Failed to start media task:', error)
      return {
        taskId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    try {
      await this.getUploadUrls(task)

      // if (task.type === MediaType.IMAGE || task.type === MediaType.VIDEO) {
      //   await this.generateThumbnail(task)
      // }

      await this.uploadFile(task)
      await this.commitUpload(task)

      task.status = MediaTaskStatus.COMPLETED
      task.progress = 100
      task.updatedAt = Date.now()

      this.notifyRenderer('media:send:result', {
        taskId,
        success: true,
        result: task.result
      })

    } catch (error) {
      task.status = MediaTaskStatus.FAILED
      task.error = error instanceof Error ? error.message : 'Upload failed'
      task.updatedAt = Date.now()

      this.notifyRenderer('media:send:result', {
        taskId,
        success: false,
        error: task.error
      })
    }
  }

  private async getUploadUrls(task: MediaTask): Promise<void> {
    const response = await axios.post('/api/media/upload-token', {
      fileName: task.fileName,
      fileSize: task.fileSize,
      mimeType: task.mimeType,
      type: task.type
    })

    task.uploadUrls = {
      origin: response.data.originUrl,
      thumbnail: response.data.thumbnailUrl
    }
  }

  private async uploadFile(task: MediaTask): Promise<void> {
    if (!task.uploadUrls) {
      throw new Error('Upload URLs not available')
    }

    task.status = MediaTaskStatus.UPLOADING
    this.notifyRenderer('media:send:state', {
      taskId: task.id,
      status: task.status,
      progress: task.progress
    })

    const fileSize = task.fileSize
    const chunkSize = this.CHUNK_SIZE
    const totalChunks = Math.ceil(fileSize / chunkSize)

    for (let i = 0; i < totalChunks; i++) {
      if (task.status === MediaTaskStatus.CANCELLED) {
        throw new Error('Upload cancelled')
      }

      const start = i * chunkSize
      const end = Math.min(start + chunkSize, fileSize)
      const chunk = createReadStream(task.filePath, { start, end })

      await this.uploadChunk(task, chunk, i, totalChunks)

      // 更新进度
      task.progress = Math.round(((i + 1) / totalChunks) * 80) // 80% for upload
      task.chunkCursor = i + 1
      task.updatedAt = Date.now()

      this.notifyRenderer('media:send:progress', {
        taskId: task.id,
        progress: task.progress,
        chunkCursor: task.chunkCursor
      })
    }
  }

  private async uploadChunk(task: MediaTask, chunk: any, chunkIndex: number, totalChunks: number): Promise<void> {
    const formData = new FormData()
    formData.append('file', chunk, `${task.fileName}.part${chunkIndex}`)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('totalChunks', totalChunks.toString())

    await axios.post(task.uploadUrls!.origin, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    })
  }

  private async commitUpload(task: MediaTask): Promise<void> {
    const response = await axios.post('/api/media/commit', {
      fileName: task.fileName,
      fileSize: task.fileSize,
      mimeType: task.mimeType,
      type: task.type
    })

    task.result = {
      originUrl: response.data.originUrl,
      thumbnailUrl: response.data.thumbnailUrl,
      fileId: response.data.fileId
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    task.status = MediaTaskStatus.CANCELLED
    task.updatedAt = Date.now()

    this.notifyRenderer('media:send:state', {
      taskId,
      status: task.status,
      progress: task.progress
    })

    return true
  }

  // 重试任务
  async retryTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    task.status = MediaTaskStatus.PENDING
    task.progress = 0
    task.error = undefined
    task.updatedAt = Date.now()

    // 重新开始处理
    this.processTask(taskId).catch(err => {
      log.error('Retry task failed:', err)
    })

    return true
  }

  // 获取任务状态
  getTaskStatus(taskId: string): MediaTask | null {
    return this.tasks.get(taskId) || null
  }

  // 获取所有任务
  getAllTasks(): MediaTask[] {
    return Array.from(this.tasks.values())
  }

  // 通知渲染进程
  private notifyRenderer(channel: string, data: any): void {
    // 这里需要获取所有渲染进程窗口并发送消息
    // 实际实现中需要维护窗口引用
    log.info(`Notifying renderer: ${channel}`, data)
  }

  // 生成任务ID
  private generateTaskId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export const mediaTaskService = new MediaTaskService()
