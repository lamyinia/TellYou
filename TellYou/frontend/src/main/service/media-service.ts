import { app, ipcMain } from 'electron'
import { join } from 'path'
import { createReadStream, existsSync, mkdirSync, statSync } from 'fs'
import axios from 'axios'
import log from 'electron-log'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { mediaUtil } from '@main/util/media-util'
import { netMaster, netMinIO } from '@main/util/net-util'

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

class MediaTaskService {
  private tasks = new Map<string, MediaTask>()
  private tempDir: string = ''
  private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB 分块

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
    ipcMain.handle('media:send:start', async (event, params: { type: MediaType, filePath: string, fileName: string, mimeType: string }) => {
        return this.startTask(params)
      }
    )
    ipcMain.handle('media:avatar:upload', async (_, { filePath, fileSize, fileSuffix }) => {
      try {
        console.log('开始上传头像:', { filePath, fileSize, fileSuffix })
        const uploadUrls = await netMaster.getUserAvatarUploadUrl(fileSize, fileSuffix)
        const mediaFile = await mediaUtil.getNormal(filePath)
        const originalFile = await mediaUtil.processImage(mediaFile, 'original')
        const thumbnailFile = await mediaUtil.processImage(mediaFile, 'thumb')
        await netMinIO.simpleUploadFile(uploadUrls.originalUploadUrl, originalFile.compressedBuffer, originalFile.newMimeType)
        await netMinIO.simpleUploadFile(uploadUrls.thumbnailUploadUrl, thumbnailFile.compressedBuffer, thumbnailFile.newMimeType)
        await netMaster.confirmUserAvatarUploaded(uploadUrls)
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

  async startTask(params: { type: MediaType, filePath: string, fileName: string, mimeType: string }): Promise<{ taskId: string; success: boolean; error?: string }> {
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
      this.processTask(taskId).catch((err) => {
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

  private async commitUpload(_task: MediaTask): Promise<void> {
    // TODO
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
