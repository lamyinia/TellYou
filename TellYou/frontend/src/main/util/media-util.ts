/* eslint-disable */

import sharp from "sharp"
import ffmpeg from "fluent-ffmpeg"
import { promises as fs } from "fs"
import path from "path"
import urlUtil from "@main/util/url-util"
import feedbackSendUtil from "./feedback-send-util"

export interface MediaFile {
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  size: number
}
export interface CompressionResult {
  compressedBuffer?: Buffer,  // 传统方式的buffer（可选）
  compressedSize: number,
  compressionRatio: number,
  newMimeType: string,
  newSuffix: string,
  outputPath?: string         // 流式处理的输出路径（可选）
}
export interface ThumbnailResult {
  thumbnailBuffer: Buffer,
  thumbnailSize: number,
  dimensions: { width: number; height: number }
}

const NON_COMPRESSIBLE_TYPES: string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "text/plain",
  "application/json",
  "application/xml"
]
const MOTION_IMAGE_TYPES = ["image/gif", "image/webp"]
const IM_COMPRESSION_CONFIG = {
  thumbnail: {
    format: "avif",
    maxSize: 300,
    quality: 30,
    crf: 63,
    cpuUsed: 4
  },
  original: {
    maxSize: 1920,
    quality: 90,
    progressive: true,
    crf: 50,
    cpuUsed: 2
  }
}

/**
 * 媒体文件处理工具类
 * 提供图片、视频、音频的压缩、缩略图生成等功能
 *
 * @author lanye
 * @date 2025/09/29 16:10
 * @description 媒体文件处理工具类，支持多种格式的压缩和预览图生成
 */

class MediaUtil {
  private readonly maxVideoSize = 1280
  private readonly thumbnailSize = 300
  private readonly suffixMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
    "audio/ogg": ".ogg"
  }
  private readonly mimeTypeMap: Record<string, string> = {
    ".json": "application/json",
    ".jpg": "image/jpg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "audio/ogg",
    ".mpeg": "audio/mpeg",
    ".wav": "audio/wav",
  }
  /**
   * 检查文件是否需要压缩
   */
  public needsCompression(mimeType: string): boolean {
    return !NON_COMPRESSIBLE_TYPES.includes(mimeType)
  }
  /**
   * 检查是否为动图
   */
  public isMotionImage(mimeType: string): boolean {
    return MOTION_IMAGE_TYPES.includes(mimeType)
  }

  /**
   * 检测AVIF文件是否为动图（使用FFmpeg）
   * @param buffer AVIF文件buffer
   * @returns Promise<boolean> 是否为动图
   */
  private async isAvifAnimated(buffer: Buffer): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const tempInputPath = path.join(urlUtil.tempPath, `avif_detect_${Date.now()}.avif`)
        await require('fs').promises.writeFile(tempInputPath, buffer)
        ffmpeg.ffprobe(tempInputPath, async (err, metadata) => {
          try {
            await require('fs').promises.unlink(tempInputPath)
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError)
          }
          if (err) {
            console.error('FFmpeg检测AVIF失败:', err)
            resolve(false)
            return
          }

          try {
            const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video')
            const frameCount = videoStream?.nb_frames ? parseInt(videoStream.nb_frames) : 0
            const duration = videoStream?.duration ? parseFloat(videoStream.duration) : 0
            const isAnimated = frameCount > 1 || duration > 0

            console.info(`AVIF动图检测结果: ${isAnimated ? '动图' : '静态图'} (frames: ${frameCount}, duration: ${duration}s)`)
            resolve(isAnimated)
          } catch (parseError) {
            console.error('解析FFmpeg元数据失败:', parseError)
            resolve(false)
          }
        })
      } catch (error) {
        console.error('AVIF动图检测过程失败:', error)
        resolve(false)
      }
    })
  }
  /**
   * 获取文件后缀
   */
  public getSuffixByMimeType(mimeType: string): string {
    return this.suffixMap[mimeType] || ".jpg"
  }

  /**
   * 计算缩放后的尺寸
   */
  private calculateDimensions(width: number, height: number, maxSize: number): { newWidth: number; newHeight: number } {
    if (width <= maxSize && height <= maxSize) {
      return { newWidth: width, newHeight: height }
    }

    const aspectRatio = width / height
    if (width > height) {
      return {
        newWidth: maxSize,
        newHeight: Math.round(maxSize / aspectRatio)
      }
    } else {
      return {
        newWidth: Math.round(maxSize * aspectRatio),
        newHeight: maxSize
      }
    }
  }

  /**
   * 获取上传格式
   */
  public getMimeTypeBySuffix(suffix: string): string {
    return this.mimeTypeMap[suffix] || "application/octet-stream"
  }
  /**
   * 获取标准参数
   */
  public async getNormal(filePath: string): Promise<MediaFile> {
    try {
      const buffer: Buffer = await fs.readFile(filePath)
      return {
        buffer: buffer,
        size: buffer.length,
        originalName: path.basename(filePath),
        mimeType: this.getMimeTypeBySuffix(path.extname(filePath))
      }
    } catch (e) {
      console.error("获取文件失败")
      throw e
    }
  }

  async processImage(mediaFile: MediaFile, strategy: "thumb" | "original"): Promise<CompressionResult> {
    const { mimeType } = mediaFile

    if (mimeType === 'image/avif') {
      return this.processAvif(mediaFile, strategy)
    }
    if (this.isMotionImage(mimeType)) {
      return this.processMotion(mediaFile, strategy)
    }
    if (strategy === "thumb") {
      return this.processStaticThumbnail(mediaFile)
    } else {
      return this.processStaticOriginal(mediaFile)
    }
  }

  /**
   * 处理AVIF文件（自动检测静态/动态）
   */
  private async processAvif(mediaFile: MediaFile, strategy: "thumb" | "original"): Promise<CompressionResult> {
    console.info('开始处理AVIF文件，检测是否为动图...')

    // 检测是否为动图
    const isAnimated = await this.isAvifAnimated(mediaFile.buffer)

    if (isAnimated) {
      console.info('检测到AVIF动图，使用FFmpeg处理')
      return this.processMotion(mediaFile, strategy)
    } else {
      console.info('检测到AVIF静态图，使用Sharp处理')
      if (strategy === "thumb") {
        return this.processStaticThumbnail(mediaFile)
      } else {
        return this.processStaticOriginal(mediaFile)
      }
    }
  }

  /**
   * 处理动图
   */
  async processMotion(mediaFile: MediaFile, strategy: "thumb" | "original"): Promise<CompressionResult> {
    const { buffer } = mediaFile
    try {
      const tempInputPath = path.join(urlUtil.tempPath, `motion_input_${Date.now()}.${mediaFile.mimeType.split("/")[1]}`)
      const tempOutputPath = path.join(urlUtil.tempPath, `motion_thumb_${Date.now()}.avif`)
      console.info("processMotion：临时目录", urlUtil.tempPath)

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)
      const currentConfig = strategy === "thumb" ? IM_COMPRESSION_CONFIG.thumbnail : IM_COMPRESSION_CONFIG.original

      feedbackSendUtil.broadcastInfo("媒体资源处理中...", "动图可能耗费较长时间，请耐心等待")
      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .size(`${currentConfig.maxSize}x?`)
          .outputOptions([
            "-c:v libaom-av1",
            "-b:v 0",
            `-crf ${currentConfig.crf}`,
            `-cpu-used 8`,
            "-threads 0",
            "-pix_fmt yuv420p",
            "-movflags +faststart",
            "-vsync cfr",
            "-f avif"
          ])
          .on("end", async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath)
              resolve(compressedData)
            } catch (error) {
              reject(error)
            }
          })
          .on("error", (err) => {
            console.error("FFmpeg 错误详情:", err.message)
            reject(err)
          })
          .save(tempOutputPath)
      })

      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempOutputPath).catch(() => {})
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "image/avif",
        newSuffix: ".avif"
      }
    } catch (error) {
      throw new Error(`动图缩略图转码失败: ${(error as Error).message}`)
    }
  }

  /**
   * 处理静态图片缩略图
   */
  async processStaticThumbnail(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer } = mediaFile
    const config = IM_COMPRESSION_CONFIG.thumbnail

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      const { newWidth, newHeight } = this.calculateDimensions(width, height, config.maxSize)
      const compressedBuffer = await sharpInstance
        .resize(newWidth, newHeight, { fit: "cover" })
        .avif({ quality: config.quality })
        .toBuffer()

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "image/avif",
        newSuffix: ".avif"
      }
    } catch (error) {
      throw new Error(`静态图片缩略图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 处理静态图片原图
   */
  async processStaticOriginal(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer, mimeType } = mediaFile
    const config = IM_COMPRESSION_CONFIG.original

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      const { newWidth, newHeight } = this.calculateDimensions(width, height, config.maxSize)

      let compressedBuffer: Buffer
      let newMimeType = mimeType

      if (mimeType === "image/png") {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true
          })
          .webp({ quality: config.quality })
          .toBuffer()
        newMimeType = "image/webp"
      } else if (mimeType === "image/jpeg") {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true
          })
          .jpeg({ quality: config.quality, progressive: config.progressive })
          .toBuffer()
      } else if (mimeType == "image/avif") {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true
          })
          .avif({ quality: config.quality })
          .toBuffer()
        newMimeType = "image/avif"
      } else {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, {
            fit: "inside",
            withoutEnlargement: true
          })
          .jpeg({ quality: config.quality, progressive: config.progressive })
          .toBuffer()
        newMimeType = "image/jpeg"
      }

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType,
        newSuffix: this.getSuffixByMimeType(newMimeType)
      }
    } catch (error) {
      throw new Error(`静态图片原图处理失败: ${(error as Error).message}`)
    }
  }

  /**
   * 压缩视频
   */
  async compressVideo(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer } = mediaFile

    try {
      const tempInputPath = path.join(
        process.cwd(),
        "temp",
        `input_${Date.now()}.mp4`
      )
      const tempOutputPath = path.join(
        process.cwd(),
        "temp",
        `output_${Date.now()}.mp4`
      )

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)

      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .size(`${this.maxVideoSize}x?`)
          .videoBitrate("1000k")
          .audioBitrate("128k")
          .format("mp4")
          .outputOptions([
            "-c:v libx264", // 使用更高效的 H.264 编码器
            "-crf 23", // 降低 CRF 值，提高压缩率
            "-preset fast", // 平衡速度和质量
            "-threads 0",
            "-movflags +faststart"
          ])
          .on("end", async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath)
              resolve(compressedData)
            } catch (error) {
              reject(error)
            }
          })
          .on("error", reject)
          .save(tempOutputPath)
      })

      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempOutputPath).catch(() => {})

      const compressionRatio =
        (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "video/mp4",
        newSuffix: ".mp4"
      }
    } catch (error) {
      throw new Error(`视频压缩失败: ${(error as Error).message}`)
    }
  }

  /**
   * 压缩音频
   */
  async compressAudio(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer, mimeType } = mediaFile

    try {
      let inputExtension = '.webm'
      if (mimeType.includes('webm')) {
        inputExtension = '.webm'
      } else if (mimeType.includes('mp4')) {
        inputExtension = '.mp4'
      } else if (mimeType.includes('wav')) {
        inputExtension = '.wav'
      } else if (mimeType.includes('mp3')) {
        inputExtension = '.mp3'
      }

      const tempInputPath = path.join(process.cwd(), "temp", `input_${Date.now()}${inputExtension}`)
      const tempOutputPath = path.join(process.cwd(), "temp", `output_${Date.now()}.ogg`)

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)

      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioBitrate("64k") // Opus在64k就有极佳表现
          .audioCodec('libopus')
          .outputOptions([
            '-application', 'voip', // 针对语音通话优化
            '-frame_duration', '20', // 20ms帧，适合实时
            '-packet_loss', '1', // 1%丢包容错
            '-ar', '48000', // Opus标准采样率
            '-ac', '1' // 单声道，语音消息通常够用
          ])
          .format("ogg") // Opus标准容器
          .on("end", async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath);
              resolve(compressedData);
            } catch (error) {
              reject(error);
            }
          })
          .on("error", (err) => {
            console.error('音频压缩FFmpeg错误:', err)
            reject(err)
          })
          .on("stderr", (stderrLine) => {
            console.log('FFmpeg stderr:', stderrLine)
          })
          .save(tempOutputPath)
      })

      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempOutputPath).catch(() => {})

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "audio/ogg",
        newSuffix: ".ogg",
      }
    } catch (error) {
      console.error('音频压缩失败:', error)
      throw new Error(`音频压缩失败: ${(error as Error).message}`)
    }
  }

  /**
   * 生成视频缩略图
   */
  async generateVideoThumbnail(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile;
    try {
      const tempVideoPath = path.join(process.cwd(), "temp", `video_${Date.now()}.mp4`)
      const tempJpgPath = path.join(process.cwd(), "temp", `thumb_${Date.now()}.jpg`)
      const tempAvifPath = path.join(process.cwd(), "temp", `thumb_${Date.now()}.avif`)

      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)
      const snap = Math.floor(Math.random() * 100);

      // 第一步：生成JPG缩略图
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: [`${snap}%`],
            filename: path.basename(tempJpgPath),
            folder: path.dirname(tempJpgPath),
            size: `${this.thumbnailSize}x?`
          })
          .on("end", () => resolve())
          .on("error", reject)
      })

      // 第二步：将JPG转换为AVIF
      const thumbnailBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempJpgPath)
          .outputOptions([
            '-f', 'avif',
            '-c:v', 'libaom-av1',
            '-crf', '30',
            '-cpu-used', '4',
            '-y'
          ])
          .output(tempAvifPath)
          .on("end", async () => {
            try {
              const thumbnailData = await fs.readFile(tempAvifPath)
              resolve(thumbnailData)
            } catch (error) {
              console.error('读取AVIF缩略图文件失败:', error)
              reject(error)
            }
          })
          .on("error", (err) => {
            console.error('AVIF转换错误:', err)
            reject(err)
          })
          .run()
      })

      await fs.unlink(tempVideoPath).catch(() => {})
      await fs.unlink(tempJpgPath).catch(() => {})
      await fs.unlink(tempAvifPath).catch(() => {})

      return {
        thumbnailBuffer,
        thumbnailSize: thumbnailBuffer.length,
        dimensions: { width: this.thumbnailSize, height: this.thumbnailSize },
      }
    } catch (error) {
      console.error('视频缩略图生成失败:', error)
      throw new Error(`视频缩略图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(mediaFile: MediaFile): Promise<{ duration: number; width: number; height: number }> {
    const { buffer } = mediaFile;

    try {
      const tempVideoPath = path.join(urlUtil.tempPath, `video_${Date.now()}.mp4`)

      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)

      const videoInfo = await new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
          if (err) {
            console.error('FFmpeg获取视频信息失败:', err)
            reject(err)
            return
          }

          const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video')
          if (!videoStream) {
            reject(new Error('未找到视频流'))
            return
          }

          const duration = metadata.format?.duration ? parseFloat(metadata.format.duration.toString()) : 0
          const width = videoStream.width || 0
          const height = videoStream.height || 0

          console.log('视频信息获取成功:', { duration, width, height })

          resolve({
            duration,
            width,
            height
          })
        })
      })

      await fs.unlink(tempVideoPath).catch(() => {})

      return videoInfo
    } catch (error) {
      console.error('获取视频信息失败:', error)
      throw new Error(`获取视频信息失败: ${(error as Error).message}`)
    }
  }

  /**
   * 流式复制文件 - 用于大文件的内存友好复制
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   * @param onProgress 进度回调 (可选)
   */
  public async streamCopyFile(sourcePath: string, targetPath: string,onProgress?: (progress: number) => void): Promise<void> {
    const fs = require('fs')
    const path = require('path')

    console.log(`开始流式复制文件: ${sourcePath} -> ${targetPath}`)

    // 确保目标目录存在
    const targetDir = path.dirname(targetPath)
    await require('fs').promises.mkdir(targetDir, { recursive: true })

    // 获取文件大小用于进度计算
    const stats = await require('fs').promises.stat(sourcePath)
    const totalSize = stats.size
    let copiedSize = 0

    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath, {
        highWaterMark: 1024 * 1024 // 1MB 缓冲区
      })
      const writeStream = fs.createWriteStream(targetPath)

      // 监听复制进度
      readStream.on('data', (chunk: Buffer) => {
        copiedSize += chunk.length
        if (onProgress && totalSize > 0) {
          const progress = Math.round((copiedSize / totalSize) * 100)
          onProgress(progress)
        }
      })

      // 复制完成
      writeStream.on('finish', () => {
        console.log(`流式复制完成: ${targetPath}`)
        resolve()
      })

      // 错误处理
      readStream.on('error', (error) => {
        console.error('读取源文件失败:', error)
        writeStream.destroy()
        reject(error)
      })

      writeStream.on('error', (error) => {
        console.error('写入目标文件失败:', error)
        readStream.destroy()
        reject(error)
      })

      // 开始流式复制
      readStream.pipe(writeStream)
    })
  }

  /**
   * 获取文件基本信息（不加载内容到内存）
   * @param filePath 文件路径
   */
  public async getFileBasicInfo(filePath: string): Promise<{
    size: number
    name: string
    ext: string
    mimeType: string
  }> {
    const path = require('path')

    const stats = await require('fs').promises.stat(filePath)
    const name = path.basename(filePath)
    const ext = path.extname(filePath)
    const mimeType = this.getMimeTypeBySuffix(ext)

    return {
      size: stats.size,
      name,
      ext,
      mimeType
    }
  }

  /**
   * 从文件路径处理图片（仿照processImage逻辑）
   * @param filePath 图片文件路径
   * @param strategy 处理策略：缩略图或原图
   */
  async processImageFromPath(filePath: string, strategy: "thumb" | "original"): Promise<CompressionResult> {
    // 获取文件MIME类型（不读取文件内容）
    const mimeType = this.getMimeTypeBySuffix(path.extname(filePath))

    if (mimeType === 'image/avif') {
      return this.processAvifFromPath(filePath, strategy)
    }
    if (this.isMotionImage(mimeType)) {
      return this.processMotionFromPath(filePath, strategy)
    }
    if (strategy === "thumb") {
      return this.processStaticThumbnailFromPath(filePath)
    } else {
      return this.processStaticOriginalFromPath(filePath)
    }
  }

  /**
   * 从文件路径处理AVIF文件（仿照processAvif逻辑）
   */
  private async processAvifFromPath(filePath: string, strategy: "thumb" | "original"): Promise<CompressionResult> {
    console.info('开始处理AVIF文件，检测是否为动图...')

    // 检测是否为动图（使用文件路径，不读取完整文件）
    const isAnimated = await this.isAvifAnimatedFromPath(filePath)

    if (isAnimated) {
      console.info('检测到AVIF动图，使用FFmpeg处理')
      return this.processMotionFromPath(filePath, strategy)
    } else {
      console.info('检测到AVIF静态图，使用Sharp处理')
      if (strategy === "thumb") {
        return this.processStaticThumbnailFromPath(filePath)
      } else {
        return this.processStaticOriginalFromPath(filePath)
      }
    }
  }

  /**
   * 从文件路径处理动图文件（流式处理，不加载到内存）
   */
  private async processMotionFromPath(filePath: string, strategy: "thumb" | "original"): Promise<CompressionResult> {
    console.info('流式处理动图文件')
    
    const tempOutputPath = path.join(urlUtil.tempPath, `motion_${strategy}_${Date.now()}.avif`)
    const currentConfig = strategy === "thumb" ? IM_COMPRESSION_CONFIG.thumbnail : IM_COMPRESSION_CONFIG.original
    
    return new Promise((resolve, reject) => {
      feedbackSendUtil.broadcastInfo("媒体资源处理中...", "动图可能耗费较长时间，请耐心等待")
      
      // 直接使用原文件路径，不需要写入临时输入文件
      ffmpeg(filePath)
        .size(`${currentConfig.maxSize}x?`)
        .outputOptions([
          "-c:v libaom-av1",
          "-b:v 0",
          `-crf ${currentConfig.crf}`,
          `-cpu-used 8`,
          "-threads 0",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-vsync cfr",
          "-f avif"
        ])
        .save(tempOutputPath)
        .on("end", async () => {
          try {
            // 不读取文件内容，只获取文件大小
            const stats = await require('fs').promises.stat(tempOutputPath)
            resolve({
              outputPath: tempOutputPath,  // 返回文件路径，不返回buffer
              compressedSize: stats.size,
              compressionRatio: 0.8, // 估算压缩比
              newMimeType: "image/avif",
              newSuffix: ".avif"
            } as any)
          } catch (error) {
            reject(error)
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg处理动图失败:", err.message)
          reject(new Error(`动图处理失败: ${err.message}`))
        })
    })
  }

  /**
   * 从文件路径处理静态图缩略图（流式处理，不加载到内存）
   */
  private async processStaticThumbnailFromPath(filePath: string): Promise<CompressionResult> {
    console.info('流式处理静态图缩略图')
    
    const tempOutputPath = path.join(urlUtil.tempPath, `thumb_${Date.now()}.avif`)
    const config = IM_COMPRESSION_CONFIG.thumbnail
    
    return new Promise((resolve, reject) => {
      // 使用FFmpeg直接处理文件路径
      ffmpeg(filePath)
        .outputOptions([
          `-vf scale=${config.maxSize}:${config.maxSize}:force_original_aspect_ratio=decrease`,
          '-c:v libaom-av1',
          `-crf ${config.crf}`,
          '-b:v 0',
          '-f avif'
        ])
        .save(tempOutputPath)
        .on("end", async () => {
          try {
            // 不读取文件内容，只获取文件大小
            const stats = await require('fs').promises.stat(tempOutputPath)
            resolve({
              outputPath: tempOutputPath,  // 返回文件路径，不返回buffer
              compressedSize: stats.size,
              compressionRatio: 0.8, // 估算压缩比
              newMimeType: "image/avif",
              newSuffix: ".avif"
            } as any)
          } catch (error) {
            reject(error)
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg处理静态图缩略图失败:", err.message)
          reject(new Error(`静态图缩略图处理失败: ${err.message}`))
        })
    })
  }

  /**
   * 从文件路径处理静态图原图（流式处理，不加载到内存）
   */
  private async processStaticOriginalFromPath(filePath: string): Promise<CompressionResult> {
    console.info('流式处理静态图原图')
    
    const mimeType = this.getMimeTypeBySuffix(path.extname(filePath))
    
    // 检查是否需要压缩
    if (NON_COMPRESSIBLE_TYPES.includes(mimeType)) {
      console.info('文件类型不需要压缩，直接返回原文件路径')
      const stats = await require('fs').promises.stat(filePath)
      return {
        outputPath: filePath,  // 直接返回原文件路径
        compressedSize: stats.size,
        compressionRatio: 1.0,
        newMimeType: mimeType,
        newSuffix: path.extname(filePath)
      } as any
    }
    
    const tempOutputPath = path.join(urlUtil.tempPath, `original_${Date.now()}.avif`)
    const config = IM_COMPRESSION_CONFIG.original
    
    return new Promise((resolve, reject) => {
      // 使用FFmpeg直接处理文件路径
      ffmpeg(filePath)
        .outputOptions([
          `-vf scale=${config.maxSize}:${config.maxSize}:force_original_aspect_ratio=decrease`,
          '-c:v libaom-av1',
          `-crf ${config.crf}`,
          '-b:v 0',
          '-f avif'
        ])
        .save(tempOutputPath)
        .on("end", async () => {
          try {
            // 不读取文件内容，只获取文件大小
            const stats = await require('fs').promises.stat(tempOutputPath)
            resolve({
              outputPath: tempOutputPath,  // 返回文件路径，不返回buffer
              compressedSize: stats.size,
              compressionRatio: 0.85, // 估算压缩比
              newMimeType: "image/avif",
              newSuffix: ".avif"
            } as any)
          } catch (error) {
            reject(error)
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg处理静态图原图失败:", err.message)
          reject(new Error(`静态图原图处理失败: ${err.message}`))
        })
    })
  }

  /**
   * 从文件路径检测AVIF是否为动图（仿照isAvifAnimated逻辑）
   */
  private async isAvifAnimatedFromPath(filePath: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        // 直接使用文件路径进行FFmpeg检测，不需要读取完整文件
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('FFmpeg检测AVIF失败:', err)
            resolve(false)
            return
          }

          try {
            const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video')
            const frameCount = videoStream?.nb_frames ? parseInt(videoStream.nb_frames) : 0
            const duration = videoStream?.duration ? parseFloat(videoStream.duration) : 0
            const isAnimated = frameCount > 1 || duration > 0

            console.info(`AVIF动图检测结果: ${isAnimated ? '动图' : '静态图'} (frames: ${frameCount}, duration: ${duration}s)`)
            resolve(isAnimated)
          } catch (parseError) {
            console.error('解析FFmpeg元数据失败:', parseError)
            resolve(false)
          }
        })
      } catch (error) {
        console.error('AVIF动图检测过程失败:', error)
        resolve(false)
      }
    })
  }

  /**
   * 从文件路径获取视频信息（不加载视频到内存）
   * @param filePath 视频文件路径
   */
  public async getVideoInfoFromPath(filePath: string): Promise<{
    duration: number
    width: number
    height: number
    mimeType: string
  }> {
    console.log(`流式获取视频信息: ${filePath}`)

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('获取视频信息失败:', err)
          reject(new Error(`获取视频信息失败: ${err.message}`))
          return
        }

        try {
          const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video')
          if (!videoStream) {
            throw new Error('未找到视频流')
          }

          const duration = Math.round(videoStream.duration ? parseFloat(videoStream.duration) : 0)
          const width = videoStream.width || 0
          const height = videoStream.height || 0
          const mimeType = this.getMimeTypeBySuffix(path.extname(filePath))

          console.log(`视频信息获取完成: ${duration}s, ${width}x${height}`)

          resolve({
            duration,
            width,
            height,
            mimeType
          })
        } catch (parseError) {
          console.error('解析视频元数据失败:', parseError)
          reject(new Error(`解析视频元数据失败: ${(parseError as Error).message}`))
        }
      })
    })
  }

  /**
   * 从文件路径生成视频缩略图（不加载视频到内存）
   * @param filePath 视频文件路径
   */
  public async generateVideoThumbnailFromPath(filePath: string): Promise<{
    outputPath: string
    size: number
    mimeType: string
    newSuffix: string
  }> {
    console.log(`流式生成视频缩略图: ${filePath}`)

    const tempOutputPath = path.join(urlUtil.tempPath, `video_thumb_${Date.now()}.avif`)

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: ['10%'],
          filename: path.basename(tempOutputPath, '.avif') + '.png',
          folder: path.dirname(tempOutputPath),
          size: '200x200'
        })
        .on('end', async () => {
          try {
            // 生成的是PNG，需要转换为AVIF
            const tempPngPath = path.join(path.dirname(tempOutputPath), path.basename(tempOutputPath, '.avif') + '.png')
            
            // 使用FFmpeg将PNG转换为AVIF
            await new Promise<void>((resolveConvert, rejectConvert) => {
              ffmpeg(tempPngPath)
                .outputOptions([
                  '-c:v libaom-av1',
                  '-crf 30',
                  '-b:v 0',
                  '-f avif'
                ])
                .save(tempOutputPath)
                .on('end', () => resolveConvert())
                .on('error', (err) => rejectConvert(err))
            })

            // 清理临时PNG文件
            await require('fs').promises.unlink(tempPngPath).catch(() => {})

            // 获取最终文件大小
            const stats = await require('fs').promises.stat(tempOutputPath)
            
            console.log(`视频缩略图生成完成: ${tempOutputPath}, ${stats.size} bytes`)

            resolve({
              outputPath: tempOutputPath,  // 返回文件路径，不返回buffer
              size: stats.size,
              mimeType: 'image/avif',
              newSuffix: '.avif'
            })
          } catch (error) {
            console.error('处理视频缩略图失败:', error)
            reject(error)
          }
        })
        .on('error', (error) => {
          console.error('生成视频缩略图失败:', error)
          reject(new Error(`生成视频缩略图失败: ${error.message}`))
        })
    })
  }

  /**
   * 从文件路径获取音频信息（不加载音频到内存）
   * @param filePath 音频文件路径
   */
  public async getAudioInfoFromPath(filePath: string): Promise<{
    duration: number
    mimeType: string
  }> {
    console.log(`流式获取音频信息: ${filePath}`)

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('获取音频信息失败:', err)
          reject(new Error(`获取音频信息失败: ${err.message}`))
          return
        }

        try {
          const audioStream = metadata.streams?.find(stream => stream.codec_type === 'audio')
          if (!audioStream) {
            throw new Error('未找到音频流')
          }

          const duration = Math.round(audioStream.duration ? parseFloat(audioStream.duration) : 0)
          const mimeType = this.getMimeTypeBySuffix(path.extname(filePath))

          console.log(`音频信息获取完成: ${duration}s`)

          resolve({
            duration,
            mimeType
          })
        } catch (parseError) {
          console.error('解析音频元数据失败:', parseError)
          reject(new Error(`解析音频元数据失败: ${(parseError as Error).message}`))
        }
      })
    })
  }

  /**
   * 从文件路径压缩音频文件（不加载到内存）
   * @param filePath 音频文件路径
   * @param targetQuality 目标质量 (0-9, 0最高质量)
   */
  public async compressAudioFromPath(filePath: string, targetQuality: number = 2): Promise<{
    outputPath: string
    size: number
    mimeType: string
    newSuffix: string
  }> {
    console.log(`流式压缩音频: ${filePath}, 质量: ${targetQuality}`)

    const tempOutputPath = path.join(urlUtil.tempPath, `audio_compressed_${Date.now()}.ogg`)

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .audioCodec('libvorbis')
        .audioQuality(targetQuality)
        .format('ogg')
        .save(tempOutputPath)
        .on('end', async () => {
          try {
            // 不读取文件内容，只获取文件大小
            const stats = await require('fs').promises.stat(tempOutputPath)

            console.log(`音频压缩完成: ${tempOutputPath}, ${stats.size} bytes`)

            resolve({
              outputPath: tempOutputPath,  // 返回文件路径，不返回buffer
              size: stats.size,
              mimeType: 'audio/ogg',
              newSuffix: '.ogg'
            })
          } catch (error) {
            console.error('处理压缩音频失败:', error)
            reject(error)
          }
        })
        .on('error', (error) => {
          console.error('压缩音频失败:', error)
          reject(new Error(`压缩音频失败: ${error.message}`))
        })
    })
  }

}

const mediaUtil = new MediaUtil()
export default mediaUtil
