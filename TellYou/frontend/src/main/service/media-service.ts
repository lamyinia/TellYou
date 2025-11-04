/* eslint-disable */

import { app, ipcMain } from 'electron'
import path, { join } from 'path'
import fs, { existsSync, mkdirSync } from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import { mediaUtil } from '@main/util/media-util'
import { netMaster, netMinIO } from '@main/util/net-util'
import messageDao from '@main/sqlite/dao/message-dao'
import messageAdapter from '@main/sqlite/adapter/message-adapter'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'
import { getMessageId } from '@shared/utils/process'
import urlUtil from '@main/util/url-util'

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  VOICE = "voice",
  FILE = "file"
}

interface UploadContext {
  messageId?: number
  filePath: string
  mediaType: MediaType
  fileName?: string
  chat: {
    targetId: string
    contactType: number
    sessionId: string
  }
  processedFiles?: any
  uploadUrls?: any
  requestFields?: any
}

class MediaTaskService {
  private tempDir: string = ""
  // private readonly CHUNK_SIZE = 5 * 1024 * 1024 // 5MB 分块

  public beginServe(): void {
    ffmpeg.setFfmpegPath(ffmpegStatic as string)
    this.tempDir = join(app.getPath("userData"), ".tellyou", "media", "temp")
    this.ensureTempDir()
    this.setupIpcHandlers()
  }

  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true })
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.on("media:send:start-by-filepath", this.uploadMediaByFilepath.bind(this))
    ipcMain.on("media:send:start-by-buffer", this.uploadMediaByBuffer.bind(this))
    ipcMain.handle("media:avatar:upload", async (_, { filePath, fileSize, fileSuffix }) => {
        try {
          console.log("开始上传头像:", { filePath, fileSize, fileSuffix })
          const uploadUrls = await netMaster.getUserAvatarUploadUrl(fileSize, fileSuffix)
          const mediaFile = await mediaUtil.getNormal(filePath)
          const originalFile = await mediaUtil.processImage(mediaFile, "original")
          const thumbnailFile = await mediaUtil.processImage(mediaFile, "thumb")
          await netMinIO.simpleUploadFile(
            uploadUrls.originalUploadUrl,
            originalFile.compressedBuffer,
            originalFile.newMimeType
          )
          await netMinIO.simpleUploadFile(
            uploadUrls.thumbnailUploadUrl,
            thumbnailFile.compressedBuffer,
            thumbnailFile.newMimeType
          )
          await netMaster.confirmUserAvatarUploaded(uploadUrls)
          console.log("确认上传完成头像URL:", uploadUrls.originalUploadUrl)
          return {
            success: true,
            avatarUrl: uploadUrls.originalUploadUrl.split("?")[0]
          }
        } catch (error) {
          console.error("Failed to upload avatar:", error)
          throw error
        }
      })
  }


  private async uploadMediaByFilepath(event: Electron.IpcMainEvent, params: any): Promise<void> {
    const { filePath, mediaType, chat } = params
    const context: UploadContext = {
      filePath,
      fileName: path.basename(filePath),
      mediaType: mediaType as MediaType,
      chat
    }

    await this.processAndUploadMedia(event, context)
  }

  private async uploadMediaByBuffer(event: Electron.IpcMainEvent, params: any): Promise<void> {
    const { fileName, fileBuffer, mediaType, chat } = params

    // 创建临时文件
    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${fileName}`)
    fs.writeFileSync(tempFilePath, Buffer.from(fileBuffer))

    const context: UploadContext = {
      filePath: tempFilePath,
      fileName: fileName,
      mediaType: mediaType as MediaType,
      chat
    }

    try {
      await this.processAndUploadMedia(event, context)
    } finally {
      // 清理临时文件
      try {
        fs.unlinkSync(tempFilePath)
      } catch (error) {
        console.warn('清理临时文件失败:', error)
      }
    }
  }

  private async processAndUploadMedia(event: Electron.IpcMainEvent, context: UploadContext): Promise<void> {
    try {
      // 1. 处理媒体文件（生成缩略图等）
      console.info("处理媒体文件（生成缩略图等）:", context)
      context.processedFiles = await this.processMediaFile(context)
      // 2. 保存本地路径到上下文
      console.info("保存本地路径到上下文:", context)
      await this.saveLocalPath(context)
      // 3. 填充请求字段
      console.info("填充请求字段:", context)
      await this.fillRequestFields(context)
      // 4. 获取上传URL
      console.info("获取上传URL:", context)
      context.uploadUrls = await this.getUploadUrl(context)
      // 5. 插入上传中消息到数据库
      console.info("插入上传中消息到数据库:", context)
      context.messageId = await this.insertUploadMessage(context)

      // 6. 立即通知渲染进程显示loading消息
      console.info("立即通知渲染进程显示loading消息:", context)
      const uploadingMessage = await messageDao.getById(context.messageId)
      if (uploadingMessage) {
        const vo = messageAdapter.adaptWebSocketMessage({
          sessionId: context.chat.sessionId,
          senderId: uploadingMessage.senderId,
          senderName: uploadingMessage.senderName,
          msgType: 0, // 上传中状态
          text: uploadingMessage.text,
          extData: uploadingMessage.extData,
          sendTime: uploadingMessage.sendTime
        }, context.messageId)

        event.sender.send('message:call-back:load-data', [vo])
      }

      // 7. 通知渲染进程开始显示上传进度
      console.info("通知渲染进程开始显示上传进度:", context)
      event.sender.send('media:upload:started', {
        messageId: context.messageId,
        sessionId: context.chat.sessionId,
        mediaType: context.mediaType,
        filePath: context.filePath
      })

      // 8. 开始上传
      console.info("开始上传:", context)
      await this.beginUpload(event, context)
      // 9. 确认上传完成
      console.info("确认上传完成:", context)
      await this.confirmUploadMessage(context)

    } catch (error) {
      console.error("媒体消息发送失败:", error)

      // 通知渲染进程上传失败
      if (context.messageId) {
        await messageDao.updateMessageType(context.messageId, -1) // 标记为失败
        event.sender.send('media:upload:failed', {
          messageId: context.messageId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      throw error
    }
  }

  private async processMediaFile(context: UploadContext): Promise<any> {
    const mediaFile = await mediaUtil.getNormal(context.filePath)

    if (context.mediaType === MediaType.IMAGE) {
      const originalFile = await mediaUtil.processImage(mediaFile, "original")
      const thumbnailFile = await mediaUtil.processImage(mediaFile, "thumb")
      return {
        originalFile,
        thumbnailFile
      }
    } else if (context.mediaType === MediaType.VIDEO) {
      // 视频处理：生成缩略图
      const originalFile = mediaFile
      const thumbnailResult = await mediaUtil.generateVideoThumbnail(mediaFile)
      const thumbnailFile = {
        buffer: thumbnailResult.thumbnailBuffer,
        size: thumbnailResult.thumbnailSize,
        mimeType: 'image/avif',
        newSuffix: '.avif'
      }
      return {
        originalFile,
        thumbnailFile
      }
    } else if (context.mediaType === MediaType.VOICE) {
      const audioInfo = await mediaUtil.getAudioInfo(mediaFile)
      const compressedFile = await mediaUtil.compressAudio(mediaFile)
      const originalFile = {
        ...compressedFile,
        duration: audioInfo.duration,
        fileName: context.fileName
      }

      return {
        originalFile
      }
    } else if (context.mediaType === MediaType.FILE) {
      return {
        originalFile: mediaFile
      }
    }
  }

  private async saveLocalPath(context: UploadContext): Promise<void> {
    // 生成本地存储路径
    const { processedFiles } = context

    // 路径标准化工具函数
    const normalizePath = (filePath: string) => path.normalize(filePath.replace(/\//g, path.sep))

    if (context.mediaType === MediaType.IMAGE && processedFiles) {
      // 确保目录存在并生成正确的文件路径
      const originalPath = urlUtil.generateFilePath('picture', context.processedFiles.originalFile.newSuffix)
      const thumbnailPath = urlUtil.generateFilePath('picture', context.processedFiles.thumbnailFile.newSuffix)
      
      // 确保目录存在
      urlUtil.ensureTodayDir('picture')
      
      processedFiles.originalLocalPath = normalizePath(originalPath)
      processedFiles.thumbnailLocalPath = normalizePath(thumbnailPath)
    } else if (context.mediaType === MediaType.VIDEO && processedFiles) {
      const originalPath = urlUtil.generateFilePath('video', context.processedFiles.originalFile.newSuffix)
      const thumbnailPath = urlUtil.generateFilePath('picture', '.avif')
      
      urlUtil.ensureTodayDir('video')
      urlUtil.ensureTodayDir('picture')
      
      processedFiles.originalLocalPath = normalizePath(originalPath)
      processedFiles.thumbnailLocalPath = normalizePath(thumbnailPath)
    } else if (context.mediaType === MediaType.VOICE && processedFiles) {
      const originalPath = urlUtil.generateFilePath('voice', context.processedFiles.originalFile.newSuffix)
      
      urlUtil.ensureTodayDir('voice')
      
      processedFiles.originalLocalPath = normalizePath(originalPath)
    } else if (context.mediaType === MediaType.FILE && processedFiles) {
      const ext = context.filePath.split('.').pop() || ''
      const originalPath = urlUtil.generateFilePath('file', `.${ext}`)
      
      urlUtil.ensureTodayDir('file')
      
      processedFiles.originalLocalPath = normalizePath(originalPath)
    }

    // 根据文件类型写入不同的buffer
    if (context.mediaType === MediaType.IMAGE || context.mediaType === MediaType.VOICE) {
      fs.writeFileSync(processedFiles.originalLocalPath, processedFiles.originalFile.compressedBuffer)
    } else if (context.mediaType === MediaType.VIDEO || context.mediaType === MediaType.FILE) {
      fs.writeFileSync(processedFiles.originalLocalPath, processedFiles.originalFile.buffer)
    }

    // 写入缩略图文件
    if (processedFiles.thumbnailFile) {
      if (context.mediaType === MediaType.VIDEO) {
        fs.writeFileSync(processedFiles.thumbnailLocalPath, processedFiles.thumbnailFile.buffer)
      } else {
        fs.writeFileSync(processedFiles.thumbnailLocalPath, processedFiles.thumbnailFile.compressedBuffer)
      }
    }
  }

  private async fillRequestFields(context: UploadContext): Promise<void> {
    const myId = store.get(uidKey) as string
    const { processedFiles } = context

    // 验证必要参数
    if (!myId) {
      throw new Error('用户ID未找到，请先登录')
    }

    context.requestFields = {
      fromUserId: myId,
      targetId: context.chat.targetId,
      contactType: context.chat.contactType,
    }

    if (context.mediaType === MediaType.IMAGE && processedFiles) {
      context.requestFields = {
        ...context.requestFields,
        fileSize: processedFiles.originalFile.compressedSize,
        fileSuffix: processedFiles.originalFile.newSuffix
      }
    } else if (context.mediaType === MediaType.VIDEO && processedFiles) {
      context.requestFields = {
        ...context.requestFields,
        fileSize: processedFiles.originalFile.buffer.length,
        fileSuffix: processedFiles.originalFile.newSuffix || '.mp4'
      }
    } else if (context.mediaType === MediaType.VOICE && processedFiles) {
      context.requestFields = {
        ...context.requestFields,
        fileSize: processedFiles.originalFile.compressedSize,
        fileSuffix: processedFiles.originalFile.newSuffix,
        duration: Math.round(processedFiles.originalFile.duration)
      }
    } else if (context.mediaType === MediaType.FILE && processedFiles) {
      const ext = context.filePath.split('.').pop() || ''
      context.requestFields = {
        ...context.requestFields,
        fileSize: processedFiles.originalFile.buffer.length,
        fileSuffix: `.${ext}`,
        fileName: context.fileName
      }
    }
  }

  private async getUploadUrl(context: UploadContext): Promise<any> {
    const { requestFields } = context

    console.log('获取上传URL请求参数:', requestFields)

    let uploadUrls
    if (context.mediaType === MediaType.IMAGE) {
      uploadUrls = await netMaster.getPictureUploadUrl(requestFields)
    } else if (context.mediaType === MediaType.VIDEO) {
      uploadUrls = await netMaster.getVideoUploadUrl(requestFields)
    } else if (context.mediaType === MediaType.VOICE) {
      uploadUrls = await netMaster.getVoiceUploadUrl(requestFields)
    } else if (context.mediaType === MediaType.FILE) {
      uploadUrls = await netMaster.getFileUploadUrl(requestFields)
    }

    console.log('获取到的上传URL:', uploadUrls)
    return uploadUrls
  }

  private async insertUploadMessage(context: UploadContext): Promise<number> {
    const myId = store.get(uidKey) as string
    const myName = store.get('myName') as string
    const now = new Date().toISOString()

    // 验证必要参数
    if (!myId) {
      throw new Error('用户ID未找到，请先登录')
    }

    console.log('用户信息:', { myId, myName })

    // 构建扩展数据
    const extData = {
      originalLocalPath: context.processedFiles?.originalLocalPath,
      thumbnailLocalPath: context.processedFiles?.thumbnailLocalPath,
      fileSize: context.requestFields?.fileSize,
      duration: context.requestFields?.duration,
      fileName: context.fileName,
      fileSuffix: context.requestFields?.fileSuffix
    }

    // 生成消息ID和序列ID
    const msgId = getMessageId()
    const sequenceId = msgId // 使用相同的ID作为序列ID
    
    // 插入上传中消息
    const messageId = await messageDao.insertUploadingMessage({
      sessionId: context.chat.sessionId,
      msgId: msgId,
      sequenceId: sequenceId,
      senderId: myId,
      senderName: myName || '未知用户',
      msgType: 0, // 上传中状态
      text: context.uploadUrls?.originalObjectName || '', // 存储objectName用于匹配
      extData: JSON.stringify(extData),
      sendTime: now
    })

    console.log(`插入上传中消息: messageId=${messageId}, sessionId=${context.chat.sessionId}`)
    return messageId
  }

  private async beginUpload(event: Electron.IpcMainEvent, context: UploadContext): Promise<void> {
    const { uploadUrls, processedFiles } = context

    try {
      if (uploadUrls.originalUploadUrl && processedFiles?.originalFile) {
        console.log('开始上传原文件:', uploadUrls.originalUploadUrl)

        await this.uploadToMinIO(uploadUrls.originalUploadUrl, processedFiles.originalFile, (progress) => {
          event.sender.send('media:upload:progress', {
            messageId: context.messageId,
            progress: Math.min(90, progress) // 原文件占90%进度
          })
        })
      }

      // 上传缩略图（如果有）
      if (uploadUrls.thumbnailUploadUrl && processedFiles?.thumbnailFile) {
        console.log('开始上传缩略图:', uploadUrls.thumbnailUploadUrl)
        await this.uploadToMinIO(uploadUrls.thumbnailUploadUrl, processedFiles.thumbnailFile, (progress) => {
          // 缩略图占剩余10%进度
          const totalProgress = 90 + Math.round(progress * 0.1)
          event.sender.send('media:upload:progress', {
            messageId: context.messageId,
            progress: totalProgress
          })
        })
      }

      // 上传完成，发送100%进度
      event.sender.send('media:upload:progress', {
        messageId: context.messageId,
        progress: 100
      })

      console.log('文件上传完成')

      // 通知渲染进程上传成功
      event.sender.send('media:upload:success', {
        messageId: context.messageId
      })

    } catch (error) {
      console.error('文件上传失败:', error)
      throw error
    }
  }

  private async confirmUploadMessage(context: UploadContext): Promise<void> {
    try {
      // 根据媒体类型调用对应的确认接口
      let confirmResult

      if (context.mediaType === MediaType.IMAGE) {
        confirmResult = await netMaster.confirmPictureUploaded({
          uploadUrls: context.uploadUrls,
          targetId: context.chat.targetId,
          contactType: context.chat.contactType,
          sessionId: context.chat.sessionId,
          messageId: context.messageId?.toString()
        })
      } else if (context.mediaType === MediaType.VIDEO) {
        confirmResult = await netMaster.confirmVideoUploaded({
          uploadUrls: context.uploadUrls,
          targetId: context.chat.targetId,
          contactType: context.chat.contactType,
          sessionId: context.chat.sessionId,
          videoDuration: context.requestFields?.videoDuration || 0,
          fileSize: context.requestFields?.fileSize || 0,
          messageId: context.messageId?.toString()
        })
      } else if (context.mediaType === MediaType.VOICE) {
        confirmResult = await netMaster.confirmVoiceUploaded({
          uploadUrls: context.uploadUrls,
          targetId: context.chat.targetId,
          contactType: context.chat.contactType,
          sessionId: context.chat.sessionId,
          duration: context.requestFields?.duration || 0,
          messageId: context.messageId?.toString()
        })
      } else if (context.mediaType === MediaType.FILE) {
        confirmResult = await netMaster.confirmFileUploaded({
          uploadUrls: context.uploadUrls,
          targetId: context.chat.targetId,
          contactType: context.chat.contactType,
          sessionId: context.chat.sessionId,
          fileName: context.requestFields?.fileName || '',
          fileSize: context.requestFields?.fileSize || 0,
          messageId: context.messageId?.toString()
        })
      }

      console.log('上传确认成功:', confirmResult)

      // 后端确认成功后会通过WebSocket发送消息回填
      // WebSocket handler会处理消息替换逻辑

    } catch (error) {
      console.error('上传确认失败:', error)
      throw error
    }
  }

  /**
   * 上传文件到MinIO（带进度）
   */
  private async uploadToMinIO(uploadUrl: string, file: any, onProgress?: (progress: number) => void): Promise<void> {
    try {
      console.log('准备上传文件:', {
        hasBuffer: !!file.buffer,
        hasCompressedBuffer: !!file.compressedBuffer,
        mimeType: file.mimeType || file.newMimeType,
        size: file.size || file.compressedSize
      })

      // 确定要上传的buffer和MIME类型
      const uploadBuffer = file.compressedBuffer || file.buffer
      const mimeType = file.newMimeType || file.mimeType || 'application/octet-stream'
      
      if (!uploadBuffer || !Buffer.isBuffer(uploadBuffer)) {
        throw new Error('无效的文件数据')
      }

      // 使用axios直接上传，支持进度回调
      await netMinIO.getAxiosInstance().put(uploadUrl, uploadBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': uploadBuffer.length.toString()
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100)
            onProgress(percentage)
          }
        }
      })

      console.log('文件上传成功')
    } catch (error) {
      console.error('MinIO上传失败:', error)
      throw error
    }
  }


}

export const mediaTaskService = new MediaTaskService()
