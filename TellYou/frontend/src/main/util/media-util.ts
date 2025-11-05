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
  compressedBuffer: Buffer,
  compressedSize: number,
  compressionRatio: number,
  newMimeType: string,
  newSuffix: string
}
export interface ThumbnailResult {
  thumbnailBuffer: Buffer,
  thumbnailSize: number,
  dimensions: { width: number; height: number }
}
export interface VideoInfo {
  duration: number,
  width: number,
  height: number,
  bitrate: number,
  codec: string
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
    ".wav": "audio/wav"
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
    return new Promise((resolve) => {
      try {
        // 创建临时文件
        const tempInputPath = path.join(urlUtil.tempPath, `avif_detect_${Date.now()}.avif`)

        // 写入临时文件
        require('fs').writeFileSync(tempInputPath, buffer)

        // 使用FFmpeg检测视频信息
        ffmpeg.ffprobe(tempInputPath, (err, metadata) => {
          // 清理临时文件
          try {
            require('fs').unlinkSync(tempInputPath)
          } catch (cleanupError) {
            console.warn('清理临时文件失败:', cleanupError)
          }

          if (err) {
            console.error('FFmpeg检测AVIF失败:', err)
            // 如果FFmpeg检测失败，默认按静态图处理
            resolve(false)
            return
          }

          try {
            // 检查是否有视频流且帧数大于1
            const videoStream = metadata.streams?.find(stream => stream.codec_type === 'video')
            const frameCount = videoStream?.nb_frames ? parseInt(videoStream.nb_frames) : 0
            const duration = videoStream?.duration ? parseFloat(videoStream.duration) : 0

            // 判断是否为动图：有多帧或有时长
            const isAnimated = frameCount > 1 || duration > 0

            console.info(`AVIF动图检测结果: ${isAnimated ? '动图' : '静态图'} (frames: ${frameCount}, duration: ${duration}s)`)
            resolve(isAnimated)
          } catch (parseError) {
            console.error('解析FFmpeg元数据失败:', parseError)
            // 解析失败时默认按静态图处理
            resolve(false)
          }
        })
      } catch (error) {
        console.error('AVIF动图检测过程失败:', error)
        // 检测过程失败时默认按静态图处理
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

    // 特殊处理AVIF
    if (mimeType === 'image/avif') {
      return this.processAvif(mediaFile, strategy)
    }

    // 其他动图类型
    if (this.isMotionImage(mimeType)) {
      return this.processMotion(mediaFile, strategy)
    }

    // 静态图片
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
      // 根据输入格式确定正确的文件扩展名
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
   * 获取音频信息（已弃用，建议从渲染进程传递时长）
   * @deprecated 建议从渲染进程传递音频时长，避免复杂的FFmpeg检测
   */
  async getAudioInfo(mediaFile: MediaFile): Promise<{ duration: number }> {
    console.warn('getAudioInfo方法已弃用，建议从渲染进程传递音频时长')

    // 简化版本，仅作为备用
    const { buffer } = mediaFile;
    try {
      const tempAudioPath = path.join(urlUtil.tempPath, `audio_${Date.now()}.webm`)

      await fs.mkdir(path.dirname(tempAudioPath), { recursive: true })
      await fs.writeFile(tempAudioPath, buffer)

      const audioInfo = await new Promise<{ duration: number }>((resolve) => {
        ffmpeg.ffprobe(tempAudioPath, (err, metadata) => {
          if (err) {
            console.error('FFmpeg检测音频失败:', err)
            resolve({ duration: 0 })
            return
          }

          let duration = 0
          if (metadata.format?.duration) {
            duration = parseFloat(metadata.format.duration.toString())
          }

          resolve({ duration })
        })
      })

      await fs.unlink(tempAudioPath).catch(() => {})
      return audioInfo
    } catch (error) {
      console.error('获取音频信息失败:', error)
      return { duration: 0 }
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
}

const mediaUtil = new MediaUtil()
export default mediaUtil
