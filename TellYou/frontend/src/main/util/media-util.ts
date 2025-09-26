import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'

// 媒体文件类型定义
export interface MediaFile {
  buffer: Buffer
  mimeType: string
  originalName: string
  size: number
}

export interface CompressionResult {
  compressedBuffer: Buffer
  compressedSize: number
  compressionRatio: number
  newMimeType: string
  newSuffix: string
}

export interface ThumbnailResult {
  thumbnailBuffer: Buffer
  thumbnailSize: number
  dimensions: { width: number; height: number }
}

export interface VideoInfo {
  duration: number
  width: number
  height: number
  bitrate: number
  codec: string
}

// 不需要压缩的文件类型
const NON_COMPRESSIBLE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'text/plain',
  'application/json',
  'application/xml'
]

// 压缩后文件后缀映射
const COMPRESSED_SUFFIXES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/mp3': '.mp3',
  'audio/aac': '.aac',
  'audio/opus': '.opus',
  'audio/ogg': '.ogg'
}

class MediaUtil {
  private readonly maxImageSize = 1920
  private readonly maxVideoSize = 1280
  private readonly thumbnailSize = 300
  private readonly previewSize = 800

  /**
   * 检查文件是否需要压缩
   */
  needsCompression(mimeType: string): boolean {
    return !NON_COMPRESSIBLE_TYPES.includes(mimeType)
  }

  /**
   * 获取压缩后的文件后缀
   */
  getCompressedSuffix(mimeType: string): string {
    return COMPRESSED_SUFFIXES[mimeType] || path.extname(mimeType)
  }

  /**
   * 压缩图片
   */
  async compressImage(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer, mimeType } = mediaFile

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      const { newWidth, newHeight } = this.calculateDimensions(width, height, this.maxImageSize)

      let compressedBuffer: Buffer
      let newMimeType = mimeType

      if (mimeType === 'image/png') {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer()
        newMimeType = 'image/webp'
      } else if (mimeType === 'image/jpeg') {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
      } else {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer()
        newMimeType = 'image/jpeg'
      }

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType,
        newSuffix: this.getCompressedSuffix(newMimeType)
      }
    } catch (error) {
      throw new Error(`图片压缩失败: ${(error as Error).message}`)
    }
  }

  /**
   * 压缩视频
   */
  async compressVideo(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer } = mediaFile

    try {
      const tempInputPath = path.join(process.cwd(), 'temp', `input_${Date.now()}.mp4`)
      const tempOutputPath = path.join(process.cwd(), 'temp', `output_${Date.now()}.mp4`)

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)

      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .size(`${this.maxVideoSize}x?`)
          .videoBitrate('1000k')
          .audioBitrate('128k')
          .format('mp4')
          .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
          .on('end', async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath)
              resolve(compressedData)
            } catch (error) {
              reject(error)
            }
          })
          .on('error', reject)
          .save(tempOutputPath)
      })

      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempOutputPath).catch(() => {})

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: 'video/mp4',
        newSuffix: '.mp4'
      }
    } catch (error) {
      throw new Error(`视频压缩失败: ${(error as Error).message}`)
    }
  }

  /**
   * 压缩音频
   */
  async compressAudio(mediaFile: MediaFile): Promise<CompressionResult> {
    const { buffer } = mediaFile

    try {
      const tempInputPath = path.join(process.cwd(), 'temp', `input_${Date.now()}.mp3`)
      const tempOutputPath = path.join(process.cwd(), 'temp', `output_${Date.now()}.mp3`)

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)

      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .audioBitrate('128k')
          .format('mp3')
          .on('end', async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath)
              resolve(compressedData)
            } catch (error) {
              reject(error)
            }
          })
          .on('error', reject)
          .save(tempOutputPath)
      })

      await fs.unlink(tempInputPath).catch(() => {})
      await fs.unlink(tempOutputPath).catch(() => {})

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: 'audio/mp3',
        newSuffix: '.mp3'
      }
    } catch (error) {
      throw new Error(`音频压缩失败: ${(error as Error).message}`)
    }
  }

  /**
   * 生成图片缩略图
   */
  async generateImageThumbnail(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      const { newWidth, newHeight } = this.calculateDimensions(width, height, this.thumbnailSize)

      const thumbnailBuffer = await sharpInstance
        .resize(newWidth, newHeight, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer()

      return {
        thumbnailBuffer,
        thumbnailSize: thumbnailBuffer.length,
        dimensions: { width: newWidth, height: newHeight }
      }
    } catch (error) {
      throw new Error(`缩略图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 生成视频缩略图
   */
  async generateVideoThumbnail(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile

    try {
      const tempVideoPath = path.join(process.cwd(), 'temp', `video_${Date.now()}.mp4`)
      const tempThumbnailPath = path.join(process.cwd(), 'temp', `thumb_${Date.now()}.jpg`)

      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)

      const thumbnailBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(tempThumbnailPath),
            folder: path.dirname(tempThumbnailPath),
            size: `${this.thumbnailSize}x?`
          })
          .on('end', async () => {
            try {
              const thumbnailData = await fs.readFile(tempThumbnailPath)
              resolve(thumbnailData)
            } catch (error) {
              reject(error)
            }
          })
          .on('error', reject)
      })

      await fs.unlink(tempVideoPath).catch(() => {})
      await fs.unlink(tempThumbnailPath).catch(() => {})

      return {
        thumbnailBuffer,
        thumbnailSize: thumbnailBuffer.length,
        dimensions: { width: this.thumbnailSize, height: this.thumbnailSize }
      }
    } catch (error) {
      throw new Error(`视频缩略图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 生成预览图
   */
  async generatePreview(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { mimeType } = mediaFile

    if (mimeType.startsWith('image/')) {
      return this.generateImagePreview(mediaFile)
    } else if (mimeType.startsWith('video/')) {
      return this.generateVideoPreview(mediaFile)
    } else {
      throw new Error(`不支持的预览图类型: ${mimeType}`)
    }
  }

  /**
   * 生成图片预览图
   */
  private async generateImagePreview(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile

    try {
      const sharpInstance = sharp(buffer)
      const metadata = await sharpInstance.metadata()
      const { width = 0, height = 0 } = metadata

      const { newWidth, newHeight } = this.calculateDimensions(width, height, this.previewSize)

      const previewBuffer = await sharpInstance
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      return {
        thumbnailBuffer: previewBuffer,
        thumbnailSize: previewBuffer.length,
        dimensions: { width: newWidth, height: newHeight }
      }
    } catch (error) {
      throw new Error(`图片预览图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 生成视频预览图
   */
  private async generateVideoPreview(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile

    try {
      const tempVideoPath = path.join(process.cwd(), 'temp', `video_${Date.now()}.mp4`)
      const tempPreviewPath = path.join(process.cwd(), 'temp', `preview_${Date.now()}.jpg`)

      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)

      const previewBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: ['50%'],
            filename: path.basename(tempPreviewPath),
            folder: path.dirname(tempPreviewPath),
            size: `${this.previewSize}x?`
          })
          .on('end', async () => {
            try {
              const previewData = await fs.readFile(tempPreviewPath)
              resolve(previewData)
            } catch (error) {
              reject(error)
            }
          })
          .on('error', reject)
      })

      await fs.unlink(tempVideoPath).catch(() => {})
      await fs.unlink(tempPreviewPath).catch(() => {})

      return {
        thumbnailBuffer: previewBuffer,
        thumbnailSize: previewBuffer.length,
        dimensions: { width: this.previewSize, height: this.previewSize }
      }
    } catch (error) {
      throw new Error(`视频预览图生成失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(mediaFile: MediaFile): Promise<VideoInfo> {
    const { buffer } = mediaFile

    try {
      const tempVideoPath = path.join(process.cwd(), 'temp', `video_${Date.now()}.mp4`)

      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)

      const videoInfo = await new Promise<VideoInfo>((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
          if (err) {
            reject(err)
            return
          }

          const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video')
          // const audioStream = metadata.streams.find((stream) => stream.codec_type === 'audio')

          if (!videoStream) {
            reject(new Error('未找到视频流'))
            return
          }

          resolve({
            duration: metadata.format.duration || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            bitrate: parseInt(String(metadata.format.bit_rate || '0')),
            codec: videoStream.codec_name || 'unknown'
          })
        })
      })

      await fs.unlink(tempVideoPath).catch(() => {})

      return videoInfo
    } catch (error) {
      throw new Error(`获取视频信息失败: ${(error as Error).message}`)
    }
  }

  /**
   * 计算压缩尺寸
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxSize: number
  ): { newWidth: number; newHeight: number } {
    if (originalWidth <= maxSize && originalHeight <= maxSize) {
      return { newWidth: originalWidth, newHeight: originalHeight }
    }

    const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight)

    return {
      newWidth: Math.round(originalWidth * ratio),
      newHeight: Math.round(originalHeight * ratio)
    }
  }

  /**
   * 智能压缩（根据文件类型自动选择压缩方法）
   */
  async smartCompress(mediaFile: MediaFile): Promise<CompressionResult> {
    const { mimeType } = mediaFile

    if (!this.needsCompression(mimeType)) {
      throw new Error(`文件类型 ${mimeType} 不需要压缩`)
    }

    if (mimeType.startsWith('image/')) {
      return this.compressImage(mediaFile)
    } else if (mimeType.startsWith('video/')) {
      return this.compressVideo(mediaFile)
    } else if (mimeType.startsWith('audio/')) {
      return this.compressAudio(mediaFile)
    } else {
      throw new Error(`不支持的压缩类型: ${mimeType}`)
    }
  }
}

// 创建 MediaUtil 实例
const mediaUtil = new MediaUtil()

export { mediaUtil, MediaUtil }
