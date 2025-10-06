import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import path from 'path'
import urlUtil from '@main/util/url-util'

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
const NON_COMPRESSIBLE_TYPES: string[] = [
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
const MOTION_IMAGE_TYPES = ['image/gif', 'image/webp', 'image/avif']
const IM_COMPRESSION_CONFIG = {
  thumbnail: {
    format: 'avif',
    maxSize: 300,
    quality: 80,
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
  private readonly previewSize = 800
  private readonly suffixMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'image/gif': '.gif'
  }
  private readonly mimeTypeMap: Record<string, string> = {
    '.json': 'application/json',
    '.jpg': 'image/jpg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mpeg': 'audio/mpeg',
    '.wav': 'audio/wav'
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
   * 获取文件后缀
   */
  public getSuffixByMimeType(mimeType: string): string {
    return this.suffixMap[mimeType] || '.jpg'
  }
  /**
   * 获取上传格式
   */
  public getMimeTypeBySuffix(suffix: string): string {
    return this.mimeTypeMap[suffix] || 'application/octet-stream'
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
      console.error('获取文件失败')
      throw e
    }
  }

  async processImage(mediaFile: MediaFile, strategy: 'thumb' | 'original'): Promise<CompressionResult> {
    const { mimeType } = mediaFile
    if (this.isMotionImage(mimeType)) {
      return this.processMotion(mediaFile, strategy)
    } else {
      if (strategy === 'thumb') {
        return this.processStaticThumbnail(mediaFile)
      } else {
        return this.processStaticOriginal(mediaFile)
      }
    }
  }

  /**
   * 处理动图
   */
  async processMotion(mediaFile: MediaFile, strategy: 'thumb' | 'original'): Promise<CompressionResult> {
    const { buffer } = mediaFile
    try {
      const tempInputPath = path.join(
        urlUtil.tempPath,
        `motion_input_${Date.now()}.${mediaFile.mimeType.split('/')[1]}`
      )
      const tempOutputPath = path.join(urlUtil.tempPath, `motion_thumb_${Date.now()}.avif`)
      console.info('临时目录', urlUtil.tempPath)

      await fs.mkdir(path.dirname(tempInputPath), { recursive: true })
      await fs.writeFile(tempInputPath, buffer)
      const currentConfig =
        strategy === 'thumb' ? IM_COMPRESSION_CONFIG.thumbnail : IM_COMPRESSION_CONFIG.original

      const compressedBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempInputPath)
          .size(`${currentConfig.maxSize}x?`)
          .outputOptions([
            '-c:v libaom-av1',
            '-b:v 0',
            `-crf ${currentConfig.crf}`,
            `-cpu-used 8`,
            '-threads 0',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
            '-vsync cfr',
            '-f avif'
          ])
          .on('end', async () => {
            try {
              const compressedData = await fs.readFile(tempOutputPath)
              resolve(compressedData)
            } catch (error) {
              reject(error)
            }
          })
          .on('error', (err) => {
            console.error('FFmpeg 错误详情:', err.message)
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
        newMimeType: 'image/avif',
        newSuffix: '.avif'
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
        .resize(newWidth, newHeight, { fit: 'cover' })
        .avif({ quality: config.quality })
        .toBuffer()

      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100

      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: 'image/avif',
        newSuffix: '.avif'
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

      if (mimeType === 'image/png') {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: config.quality })
          .toBuffer()
        newMimeType = 'image/webp'
      } else if (mimeType === 'image/jpeg') {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: config.quality, progressive: config.progressive })
          .toBuffer()
      } else if (mimeType == 'image/avif') {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .avif({ quality: config.quality})
          .toBuffer()
        newMimeType = 'image/avif'
      } else {
        compressedBuffer = await sharpInstance
          .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: config.quality, progressive: config.progressive })
          .toBuffer()
        newMimeType = 'image/jpeg'
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
          .outputOptions([
            '-c:v libx264', // 使用更高效的 H.264 编码器
            '-crf 23', // 降低 CRF 值，提高压缩率
            '-preset fast', // 平衡速度和质量
            '-threads 0',
            '-movflags +faststart'
          ])
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
   * 生成视频缩略图
   */
  async generateVideoThumbnail(mediaFile: MediaFile): Promise<ThumbnailResult> {
    const { buffer } = mediaFile
    try {
      const tempVideoPath = path.join(process.cwd(), 'temp', `video_${Date.now()}.mp4`)
      const tempThumbnailPath = path.join(process.cwd(), 'temp', `thumb_${Date.now()}.jpg`)
      await fs.mkdir(path.dirname(tempVideoPath), { recursive: true })
      await fs.writeFile(tempVideoPath, buffer)
      const snap = Math.floor(Math.random() * 100)

      const thumbnailBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: [`${snap}%`],
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

    if (mimeType.startsWith('video/')) {
      return this.generateVideoPreview(mediaFile)
    } else {
      throw new Error(`不支持的预览图类型: ${mimeType}`)
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
      const snap = Math.floor(Math.random() * 100)

      const previewBuffer = await new Promise<Buffer>((resolve, reject) => {
        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: [`${snap}%`],
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
  private calculateDimensions(originalWidth: number, originalHeight: number, maxSize: number): { newWidth: number; newHeight: number } {
    if (originalWidth <= maxSize && originalHeight <= maxSize) {
      return { newWidth: originalWidth, newHeight: originalHeight }
    }

    const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight)

    return {
      newWidth: Math.round(originalWidth * ratio),
      newHeight: Math.round(originalHeight * ratio)
    }
  }
}

// 创建 MediaUtil 实例
const mediaUtil = new MediaUtil()

export { mediaUtil, MediaUtil }
