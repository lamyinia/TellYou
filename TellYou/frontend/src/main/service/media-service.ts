/* eslint-disable */

import { app, ipcMain } from 'electron'
import path, { join } from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import mediaUtil from '@main/util/media-util'
import { netMaster, netMinIO } from '@main/util/net-util'
import messageDao from '@main/sqlite/dao/message-dao'
import messageAdapter from '@main/sqlite/adapter/message-adapter'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'
import { getMessageId } from '@shared/utils/process'
import urlUtil from '@main/util/url-util'
import feedbackSendUtil from '@main/util/feedback-send-util'
import { StreamUploader } from '@main/util/net-util'

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  VOICE = "voice",
  FILE = "file"
}

// 处理策略类型定义
type ProcessingStrategy = 'memory' | 'stream' | 'skip'

interface UploadContext {
  messageId?: number
  filePath: string
  mediaType: MediaType
  fileName?: string
  duration?: number // 音频/视频时长（秒）
  chat: {
    targetId: string
    contactType: number
    sessionId: string
  }
  processedFiles?: any
  uploadUrls?: any
  requestFields?: any
  // 新增：文件处理策略相关字段
  processingStrategy?: ProcessingStrategy
  fileSize?: number
  skipProcessing?: boolean
}


class MediaTaskService {
  private tempDir: string = ""

  public async beginServe(): Promise<void> {
    ffmpeg.setFfmpegPath(ffmpegStatic as string)
    this.tempDir = join(app.getPath("userData"), ".tellyou", "media", "temp")
    await this.ensureTempDir()
    this.setupIpcHandlers()
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.promises.access(this.tempDir)
    } catch {
      await fs.promises.mkdir(this.tempDir, { recursive: true })
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.on("media:send:start-by-filepath", this.uploadMediaByFilepath.bind(this))
    ipcMain.on("media:send:start-by-buffer", this.uploadMediaByBuffer.bind(this))
    ipcMain.handle("media:avatar:upload", async (_, { filePath, fileSize, fileSuffix }) => {
        try {
          console.log("开始上传头像:", { filePath, fileSize, fileSuffix })
          const uploadUrls = await netMaster.getUserAvatarUploadUrl(fileSize, fileSuffix)

          // 使用流式处理，不加载到内存
          const originalResult = await mediaUtil.processImageFromPath(filePath, "original")
          const thumbnailResult = await mediaUtil.processImageFromPath(filePath, "thumb")

          // 使用流式上传
          await StreamUploader.streamUploadFile(
            uploadUrls.originalUploadUrl,
            originalResult.outputPath!,
            { 
              contentType: originalResult.newMimeType,
              timeout: 600000  // 10分钟超时
            }
          )
          await StreamUploader.streamUploadFile(
            uploadUrls.thumbnailUploadUrl,
            thumbnailResult.outputPath!,
            { 
              contentType: thumbnailResult.newMimeType,
              timeout: 600000  // 10分钟超时
            }
          )

          // 清理临时文件
          await fs.promises.unlink(originalResult.outputPath!).catch(() => {})
          await fs.promises.unlink(thumbnailResult.outputPath!).catch(() => {})

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
    const { filePath, fileName, fileSize, mediaType, chat, duration } = params

    console.log(`开始处理文件路径: ${filePath}`)

    // 获取文件大小（如果没有提供）
    const stats = await fs.promises.stat(filePath)
    const actualFileSize = fileSize || stats.size
    const actualFileName = fileName || path.basename(filePath)

    // 确定处理策略
    const strategy = this.determineProcessingStrategy(actualFileSize, actualFileName, mediaType as MediaType)

    const context: UploadContext = {
      filePath,
      fileName: actualFileName,
      mediaType: mediaType as MediaType,
      duration, // 传递音频时长（如果有）
      chat,
      processingStrategy: strategy,
      fileSize: actualFileSize,
      skipProcessing: strategy === 'skip'
    }

    console.log(`文件处理策略: ${strategy}, 文件大小: ${actualFileSize} bytes`)

    this.processAndUploadMedia(event, context)
      .catch(error => {
        console.error('异步媒体处理失败:', error)
        event.sender.send('media:upload:error', {
          fileName: context.fileName,
          error: error.message
        })
      })
  }

  private async uploadMediaByBuffer(event: Electron.IpcMainEvent, params: any): Promise<void> {
    const { fileName, fileBuffer, mediaType, chat } = params

    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${fileName}`)
    await fs.promises.writeFile(tempFilePath, Buffer.from(fileBuffer))

    const context: UploadContext = {
      filePath: tempFilePath,
      fileName: fileName,
      mediaType: mediaType as MediaType,
      chat
    }

    console.log(`开始异步处理文件: ${fileName}`)
    this.processAndUploadMediaAsync(event, context, tempFilePath)
      .catch(error => {
        console.error('异步媒体处理失败:', error)
        event.sender.send('media:upload:error', {
          fileName: fileName,
          error: error.message
        })
      })
  }

  private async processAndUploadMediaAsync(event: Electron.IpcMainEvent, context: UploadContext, tempFilePath: string): Promise<void> {
    try {
      await this.processAndUploadMedia(event, context)
    } finally {
      try {
        await fs.promises.unlink(tempFilePath)
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
      await new Promise(resolve => setImmediate(resolve))  // 让出事件循环控制权，避免长时间阻塞

      // 2. 保存本地路径到上下文
      console.info("保存本地路径到上下文:", context)
      await this.saveLocalPath(context)
      await new Promise(resolve => setImmediate(resolve))

      // 3. 填充请求字段
      console.info("填充请求字段:", context)
      await this.fillRequestFields(context)
      await new Promise(resolve => setImmediate(resolve))

      // 4. 获取上传URL
      console.info("获取上传URL:", context)
      context.uploadUrls = await this.getUploadUrl(context)
      await new Promise(resolve => setImmediate(resolve))

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
        console.info('通知渲染进程 loading-message', vo)
        event.sender.send('message:call-back:load-data', [vo])
      }

      // 7. 通知渲染进程开始显示上传进度
      console.info("通知渲染进程开始显示上传进度:", context)
      event.sender.send('media:upload:started', {
        messageId: context.messageId,
        sessionId: context.chat.sessionId,
        mediaType: context.mediaType,
        filePath: context.filePath || context.fileName || 'unknown'
      })
      console.log('发送上传开始事件:', { messageId: context.messageId, sessionId: context.chat.sessionId, mediaType: context.mediaType })

      // 8. 开始上传
      console.info("开始上传:", context)
      await this.beginUpload(event, context)
      // 9. 确认上传完成
      console.info("确认上传完成:", context)
      await this.confirmUploadMessage(context)

    } catch (error: any) {
      console.error("媒体消息发送失败:", error)
      feedbackSendUtil.broadcastInfo('媒体消息发送失败...', error.message || '')

      if (context.messageId) {
        await messageDao.updateMessageType(context.messageId, -1)
        event.sender.send('media:upload:failed', {
          messageId: context.messageId,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      throw error
    }
  }

  private async processMediaFile(context: UploadContext): Promise<any> {
    console.log(`处理媒体文件 - 策略: ${context.processingStrategy}, 文件: ${context.fileName}`)
    switch (context.processingStrategy) {
      case 'skip':
        return this.handleSkipProcessing(context)
      case 'stream':
        return this.handleStreamProcessing(context)
      case 'memory':
      default:
        return this.handleMemoryProcessing(context)
    }
  }

  /**
   * 跳过处理：直接返回文件信息，不加载到内存
   */
  private async handleSkipProcessing(context: UploadContext): Promise<any> {
    console.log(`跳过处理大文件: ${context.fileName} (${context.fileSize} bytes)`)

    return {
      originalFile: {
        filePath: context.filePath,
        fileName: context.fileName,
        size: context.fileSize,
        mimeType: this.getMimeTypeByExtension(context.fileName || ''),
        skipProcessing: true
      }
    }
  }

  /**
   * 流式处理：处理文件但不加载到内存，返回处理后的文件路径
   */
  private async handleStreamProcessing(context: UploadContext): Promise<any> {
    console.log(`流式处理中等文件: ${context.fileName} (${context.fileSize} bytes)`)

    if (context.mediaType === MediaType.IMAGE) {
      try {
        // 使用流式处理方法，直接输出到临时文件
        const originalResult = await mediaUtil.processImageFromPath(context.filePath, "original")
        const thumbnailResult = await mediaUtil.processImageFromPath(context.filePath, "thumb")

        return {
          originalFile: {
            filePath: originalResult.outputPath,        // 直接使用输出路径
            fileName: context.fileName,
            size: originalResult.compressedSize,
            mimeType: originalResult.newMimeType,
            newSuffix: originalResult.newSuffix,
            streamProcessed: true                       // 标记为流式处理
          },
          thumbnailFile: {
            filePath: thumbnailResult.outputPath,       // 缩略图也不保留buffer，使用文件路径
            size: thumbnailResult.compressedSize,
            mimeType: thumbnailResult.newMimeType,
            newSuffix: thumbnailResult.newSuffix
          }
        }
      } catch (error) {
        console.warn('流式处理图片失败，降级为跳过处理:', error)
        return this.handleSkipProcessing(context)
      }
    } else if (context.mediaType === MediaType.VIDEO) {
      try {
        // 视频流式处理
        const videoInfo = await mediaUtil.getVideoInfoFromPath(context.filePath)
        const thumbnailResult = await mediaUtil.generateVideoThumbnailFromPath(context.filePath)

        return {
          originalFile: {
            filePath: context.filePath,        // 视频文件直接使用原路径
            fileName: context.fileName,
            size: context.fileSize,
            duration: videoInfo.duration,
            width: videoInfo.width,
            height: videoInfo.height,
            mimeType: videoInfo.mimeType,
            streamProcessed: true              // 标记为流式处理
          },
          thumbnailFile: {
            filePath: thumbnailResult.outputPath, // 缩略图使用输出路径
            size: thumbnailResult.size,
            mimeType: thumbnailResult.mimeType,
            newSuffix: thumbnailResult.newSuffix
          }
        }
      } catch (error) {
        console.warn('流式处理视频失败，降级为跳过处理:', error)
        return this.handleSkipProcessing(context)
      }
    } else if (context.mediaType === MediaType.VOICE) {
      try {
        // 音频流式处理
        const audioInfo = await mediaUtil.getAudioInfoFromPath(context.filePath)
        const compressedResult = await mediaUtil.compressAudioFromPath(context.filePath)

        return {
          originalFile: {
            filePath: compressedResult.outputPath, // 返回压缩后的文件路径
            fileName: context.fileName,
            size: compressedResult.size,
            duration: audioInfo.duration,
            mimeType: compressedResult.mimeType,
            newSuffix: compressedResult.newSuffix,
            streamProcessed: true               // 标记为流式处理
          }
        }
      } catch (error) {
        console.warn('流式处理音频失败，降级为跳过处理:', error)
        return this.handleSkipProcessing(context)
      }
    } else {
      // 其他类型直接跳过处理
      return this.handleSkipProcessing(context)
    }
  }

  /**
   * 内存处理：原有的完整处理逻辑（小文件）
   */
  private async handleMemoryProcessing(context: UploadContext): Promise<any> {
    console.log(`内存处理小文件: ${context.fileName} (${context.fileSize} bytes)`)

    // 原有的完整处理逻辑
    const mediaFile = await mediaUtil.getNormal(context.filePath)

    if (context.mediaType === MediaType.IMAGE) {
      const originalFile = await mediaUtil.processImage(mediaFile, "original")
      const thumbnailFile = await mediaUtil.processImage(mediaFile, "thumb")
      return {
        originalFile,
        thumbnailFile
      }
    } else if (context.mediaType === MediaType.VIDEO) {
      const videoInfo = await mediaUtil.getVideoInfo(mediaFile)
      const thumbnailResult = await mediaUtil.generateVideoThumbnail(mediaFile)
      const originalFile = {
        ...mediaFile,
        duration: Math.round(videoInfo.duration || 0), // 视频时长（秒，整数）
        width: videoInfo.width || 0,
        height: videoInfo.height || 0,
        fileName: context.fileName
      }
      const thumbnailFile = {
        buffer: thumbnailResult.thumbnailBuffer,
        size: thumbnailResult.thumbnailSize,
        mimeType: 'image/avif',
        newSuffix: '.avif'
      }
      console.log('获取视频信息:', { duration: originalFile.duration, width: originalFile.width, height: originalFile.height })
      return {
        originalFile,
        thumbnailFile
      }
    } else if (context.mediaType === MediaType.VOICE) {
      const compressedFile = await mediaUtil.compressAudio(mediaFile)
      const originalFile = {
        ...compressedFile,
        duration: context.duration || 0, // 使用渲染进程传递的时长
        fileName: context.fileName
      }
      console.log('使用渲染进程传递的音频时长:', context.duration)
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
    const { processedFiles } = context

    const normalizePath = (filePath: string) => path.normalize(filePath.replace(/\//g, path.sep))

    // 根据处理策略选择保存方式
    if (processedFiles?.originalFile?.skipProcessing || processedFiles?.originalFile?.streamProcessed) {
      const saveType = processedFiles.originalFile.skipProcessing ? '跳过处理的大文件' : '流式处理的文件'
      console.log(`使用流式复制保存${saveType}: ${context.fileName} (${context.fileSize} bytes)`)
      await this.handleStreamCopyToLocal(context)
      return
    }

    // 小文件使用原有的内存保存逻辑
    if (context.mediaType === MediaType.IMAGE && processedFiles) {
      const originalPath = urlUtil.generateFilePath('picture', context.processedFiles.originalFile.newSuffix)
      const thumbnailPath = urlUtil.generateFilePath('picture', context.processedFiles.thumbnailFile.newSuffix)
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

    // 小文件内存保存
    if (context.mediaType === MediaType.IMAGE || context.mediaType === MediaType.VOICE) {
      await fs.promises.writeFile(processedFiles.originalLocalPath, processedFiles.originalFile.compressedBuffer)
    } else if (context.mediaType === MediaType.VIDEO || context.mediaType === MediaType.FILE) {
      await fs.promises.writeFile(processedFiles.originalLocalPath, processedFiles.originalFile.buffer)
    }

    if (processedFiles.thumbnailFile) {
      if (context.mediaType === MediaType.VIDEO) {
        await fs.promises.writeFile(processedFiles.thumbnailLocalPath, processedFiles.thumbnailFile.buffer)
      } else {
        await fs.promises.writeFile(processedFiles.thumbnailLocalPath, processedFiles.thumbnailFile.compressedBuffer)
      }
    }
  }

  /**
   * 处理大文件的流式复制到本地
   */
  private async handleStreamCopyToLocal(context: UploadContext): Promise<void> {
    const { processedFiles } = context
    const normalizePath = (filePath: string) => path.normalize(filePath.replace(/\//g, path.sep))

    // 生成目标路径
    let targetPath: string
    let targetDir: string

    switch (context.mediaType) {
      case MediaType.IMAGE:
        targetDir = 'picture'
        const ext = path.extname(context.filePath) || '.jpg'
        targetPath = urlUtil.generateFilePath('picture', ext)
        break

      case MediaType.VIDEO:
        targetDir = 'video'
        const videoExt = path.extname(context.filePath) || '.mp4'
        targetPath = urlUtil.generateFilePath('video', videoExt)
        break

      case MediaType.VOICE:
        targetDir = 'voice'
        const audioExt = path.extname(context.filePath) || '.mp3'
        targetPath = urlUtil.generateFilePath('voice', audioExt)
        break

      case MediaType.FILE:
      default:
        targetDir = 'file'
        const fileExt = path.extname(context.filePath) || ''
        targetPath = urlUtil.generateFilePath('file', fileExt)
        break
    }

    urlUtil.ensureTodayDir(targetDir)
    
    // 确定源文件路径
    let sourcePath: string
    if (processedFiles.originalFile.streamProcessed && processedFiles.originalFile.filePath) {
      // 流式处理后的文件，使用处理后的文件路径
      sourcePath = processedFiles.originalFile.filePath
      console.log(`流式复制处理后文件: ${sourcePath} -> ${targetPath}`)
    } else {
      // 跳过处理的文件，使用原文件路径
      sourcePath = context.filePath
      console.log(`流式复制原文件: ${sourcePath} -> ${targetPath}`)
    }
    
    await mediaUtil.streamCopyFile(sourcePath, targetPath, (progress) => {
      console.log(`复制进度: ${progress}%`)
    })

    processedFiles.originalLocalPath = normalizePath(targetPath)

    // 处理缩略图保存
    if (processedFiles.thumbnailFile) {
      const thumbnailPath = urlUtil.generateFilePath('picture', '.avif')
      urlUtil.ensureTodayDir('picture')
      processedFiles.thumbnailLocalPath = normalizePath(thumbnailPath)

      if (processedFiles.thumbnailFile.filePath) {
        // 流式复制缩略图
        console.log(`流式复制缩略图: ${processedFiles.thumbnailFile.filePath} -> ${thumbnailPath}`)
        await mediaUtil.streamCopyFile(processedFiles.thumbnailFile.filePath, thumbnailPath, (progress) => {
          console.log(`缩略图复制进度: ${progress}%`)
        })
      } else if (processedFiles.thumbnailFile.buffer) {
        // 传统方式保存缩略图
        await fs.promises.writeFile(thumbnailPath, processedFiles.thumbnailFile.buffer)
        console.log(`缩略图保存完成: ${thumbnailPath}`)
      }
    }
  }

  private async fillRequestFields(context: UploadContext): Promise<void> {
    const fromUserId = store.get(uidKey) as string
    const { processedFiles } = context
    // 验证必要参数
    if (!fromUserId) {
      throw new Error('用户ID未找到，请先登录')
    }

    context.requestFields = {
      fromUserId: fromUserId,
      targetId: context.chat.targetId,
      contactType: context.chat.contactType,
    }

    if (context.mediaType === MediaType.IMAGE && processedFiles) {
      // 支持流式处理：从文件路径获取大小
      let fileSize: number
      if (processedFiles.originalFile.streamProcessed && processedFiles.originalFile.filePath) {
        // 流式处理：从文件路径获取大小
        const stats = await fs.promises.stat(processedFiles.originalFile.filePath)
        fileSize = stats.size
      } else {
        // 传统处理：从buffer获取大小
        fileSize = processedFiles.originalFile.compressedSize || processedFiles.originalFile.size || 0
      }

      context.requestFields = {
        ...context.requestFields,
        fileSize,
        fileSuffix: processedFiles.originalFile.newSuffix
      }
    } else if (context.mediaType === MediaType.VIDEO && processedFiles) {
      // 支持流式处理：从文件路径获取大小
      let fileSize: number
      if (processedFiles.originalFile.streamProcessed && processedFiles.originalFile.filePath) {
        // 流式处理：从文件路径获取大小
        const stats = await fs.promises.stat(processedFiles.originalFile.filePath)
        fileSize = stats.size
      } else {
        // 传统处理：从buffer获取大小
        fileSize = processedFiles.originalFile.buffer?.length || processedFiles.originalFile.size || 0
      }

      context.requestFields = {
        ...context.requestFields,
        fileSize,
        fileSuffix: processedFiles.originalFile.newSuffix || '.mp4',
        videoDuration: Math.round(processedFiles.originalFile.duration || 0)
      }
    } else if (context.mediaType === MediaType.VOICE && processedFiles) {
      // 支持流式处理：从文件路径获取大小
      let fileSize: number
      if (processedFiles.originalFile.streamProcessed && processedFiles.originalFile.filePath) {
        // 流式处理：从文件路径获取大小
        const stats = await fs.promises.stat(processedFiles.originalFile.filePath)
        fileSize = stats.size
      } else {
        // 传统处理：从buffer获取大小
        fileSize = processedFiles.originalFile.compressedSize || processedFiles.originalFile.size || 0
      }

      context.requestFields = {
        ...context.requestFields,
        fileSize,
        fileSuffix: processedFiles.originalFile.newSuffix,
        duration: Math.round(processedFiles.originalFile.duration || 0)
      }
    } else if (context.mediaType === MediaType.FILE && processedFiles) {
      const ext = context.filePath.split('.').pop() || ''
      context.requestFields = {
        ...context.requestFields,
        fileSize: context.fileSize,
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
    const fromUserId = store.get(uidKey) as string
    const myName = store.get('myName') as string
    const now = new Date().toISOString()

    if (!fromUserId) {
      throw new Error('用户ID未找到，请先登录')
    }

    console.log('用户信息:', { fromUserId, myName })

    const extData = {
      originalLocalPath: context.processedFiles?.originalLocalPath,
      thumbnailLocalPath: context.processedFiles?.thumbnailLocalPath,
      fileSize: context.requestFields?.fileSize,
      duration: context.requestFields?.duration,
      fileName: context.fileName,
      fileSuffix: context.requestFields?.fileSuffix
    }

    const msgId = getMessageId()  // 补位 ID，后期会进行回补
    const sequenceId = msgId
    const objectName = urlUtil.extractObjectName(context.uploadUrls?.originalUploadUrl || '')
    // 插入上传中消息
    const messageId = await messageDao.insertUploadingMessage({
      sessionId: context.chat.sessionId,
      msgId: msgId,
      sequenceId: sequenceId,
      senderId: fromUserId,
      senderName: myName || '未知用户',
      msgType: 0,
      text: objectName, // 存储objectName用于匹配
      extData: JSON.stringify(extData),
      sendTime: now
    })

    console.log(`插入上传中消息: messageId=${messageId}, sessionId=${context.chat.sessionId}`)
    return messageId
  }

  private async beginUpload(event: Electron.IpcMainEvent, context: UploadContext): Promise<void> {
    try {
      const { uploadUrls, processedFiles } = context

      if (uploadUrls.originalUploadUrl && processedFiles?.originalFile) {
        console.info('media-service: 开始上传原文件:', uploadUrls.originalUploadUrl)
        if (processedFiles.originalFile.filePath && (processedFiles.originalFile.skipProcessing || processedFiles.originalFile.streamProcessed)) {
          const uploadType = processedFiles.originalFile.skipProcessing ? '跳过处理的大文件' : '流式处理的文件'
          console.info(`media-service: 使用流式上传${uploadType}:`, processedFiles.originalFile.filePath)
          await StreamUploader.streamUploadFile(
            uploadUrls.originalUploadUrl,
            processedFiles.originalFile.filePath,
            {
              contentType: processedFiles.originalFile.mimeType || processedFiles.originalFile.newMimeType,
              onProgress: (progress) => {
                event.sender.send('media:upload:progress', {
                  messageId: context.messageId,
                  progress: Math.min(90, progress)
                })
              }
            })
        } else {
          // 传统上传：只有memory处理的小文件
          console.info('media-service: 使用传统上传小文件（内存处理）')
          await this.uploadToMinIO(uploadUrls.originalUploadUrl, processedFiles.originalFile, (progress) => {
            event.sender.send('media:upload:progress', {
              messageId: context.messageId,
              progress: Math.min(90, progress)
            })
          })
        }
      }

      // 上传缩略图（如果有）
      if (uploadUrls.thumbnailUploadUrl && processedFiles?.thumbnailFile) {
        console.log('开始上传缩略图:', uploadUrls.thumbnailUploadUrl)

        // 判断缩略图是否使用流式上传
        if (processedFiles.thumbnailFile.filePath) {
          // 流式上传缩略图
          console.info('media-service: 使用流式上传缩略图:', processedFiles.thumbnailFile.filePath)
          await StreamUploader.streamUploadFile(
            uploadUrls.thumbnailUploadUrl,
            processedFiles.thumbnailFile.filePath,
            {
              contentType: processedFiles.thumbnailFile.mimeType || processedFiles.thumbnailFile.newMimeType,
              onProgress: (progress) => {
                const totalProgress = 90 + Math.round(progress * 0.1)
                event.sender.send('media:upload:progress', {
                  messageId: context.messageId,
                  progress: totalProgress
                })
              }
            })
        } else {
          // 传统上传缩略图
          console.info('media-service: 使用传统上传缩略图')
          await this.uploadToMinIO(uploadUrls.thumbnailUploadUrl, processedFiles.thumbnailFile, (progress) => {
            // 缩略图占剩余10%进度
            const totalProgress = 90 + Math.round(progress * 0.1)
            event.sender.send('media:upload:progress', {
              messageId: context.messageId,
              progress: totalProgress
            })
          })
        }
      }

      // 上传完成，发送100%进度
      event.sender.send('media:upload:progress', {
        messageId: context.messageId,
        progress: 100
      })

      console.log('文件上传完成')

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
            console.log('MinIO上传进度:', {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: percentage + '%'
            })
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

  /**
   * 根据文件大小和类型确定处理策略
   */
  private determineProcessingStrategy(fileSize: number, fileName: string, mediaType: MediaType): ProcessingStrategy {
    console.log(`策略判断 - 文件: ${fileName}, 大小: ${fileSize} bytes, 类型: ${mediaType}`)

    const threshold = 2 * 1024 * 1024 // 2MB阈值

    if (mediaType === MediaType.IMAGE || mediaType === MediaType.VIDEO || mediaType === MediaType.VOICE) {
      // 媒体文件：小于2MB用memory，否则用stream
      if (fileSize < threshold) {
        console.log('策略: memory (小媒体文件)')
        return 'memory'
      } else {
        console.log('策略: stream (大媒体文件)')
        return 'stream'
      }
    } else if (mediaType === MediaType.FILE) {
      // 普通文件：小于2MB用memory，否则用skip
      if (fileSize < threshold) {
        console.log('策略: memory (小文件)')
        return 'memory'
      } else {
        console.log('策略: skip (大文件)')
        return 'skip'
      }
    }

    // 默认策略
    console.log('策略: memory (默认)')
    return 'memory'
  }

  /**
   * 根据文件扩展名获取MIME类型
   */
  private getMimeTypeByExtension(fileName: string): string {
    const ext = fileName.toLowerCase()
    const mimeMap: Record<string, string> = {
      // 文档类型
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      // 压缩文件
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      // 媒体文件
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    }

    for (const [extension, mimeType] of Object.entries(mimeMap)) {
      if (ext.endsWith(extension)) {
        return mimeType
      }
    }

    return 'application/octet-stream'
  }


}

export const mediaTaskService = new MediaTaskService()
