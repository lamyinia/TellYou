import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, statSync, createReadStream } from 'fs'
import { createHash } from 'crypto'
import axios from 'axios'
import log from 'electron-log'
import { ipcMain } from 'electron'

// 媒体任务状态
export enum MediaTaskStatus {
  PENDING = 'pending',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 媒体类型
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file'
}

// 媒体任务接口
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

// 媒体任务服务类
class MediaTaskService {
  private tasks = new Map<string, MediaTask>()
  private tempDir: string
  private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB 分块
  private readonly MAX_CONCURRENT = 3 // 最大并发上传数
  private readonly RETRY_TIMES = 3 // 重试次数

  constructor() {
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
    // 开始媒体任务
    ipcMain.handle('media:send:start', async (event, params: {
      type: MediaType
      filePath: string
      fileName: string
      mimeType: string
    }) => {
      return this.startTask(params)
    })

    // 取消媒体任务
    ipcMain.handle('media:send:cancel', async (event, taskId: string) => {
      return this.cancelTask(taskId)
    })

    // 重试媒体任务
    ipcMain.handle('media:send:retry', async (event, taskId: string) => {
      return this.retryTask(taskId)
    })

    // 获取任务状态
    ipcMain.handle('media:send:status', async (event, taskId: string) => {
      return this.getTaskStatus(taskId)
    })

    // 获取所有任务
    ipcMain.handle('media:send:list', async () => {
      return this.getAllTasks()
    })
  }

  // 开始新的媒体任务
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
      
      // 异步开始上传
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

  // 处理媒体任务
  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    try {
      // 1. 获取上传URL
      await this.getUploadUrls(task)
      
      // 2. 生成缩略图（如果需要）
      if (task.type === MediaType.IMAGE || task.type === MediaType.VIDEO) {
        await this.generateThumbnail(task)
      }

      // 3. 开始上传
      await this.uploadFile(task)

      // 4. 提交到后端
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

  // 获取上传URL
  private async getUploadUrls(task: MediaTask): Promise<void> {
    // 调用后端API获取预签名URL
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

  // 生成缩略图
  private async generateThumbnail(task: MediaTask): Promise<void> {
    // 这里可以集成ffmpeg或其他图像处理库
    // 暂时跳过，假设后端会处理
    log.info(`Generating thumbnail for ${task.fileName}`)
  }

  // 上传文件
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

    // 分块上传
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

      // 上传分块
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

  // 上传单个分块
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

  // 提交上传
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

  // 取消任务
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
