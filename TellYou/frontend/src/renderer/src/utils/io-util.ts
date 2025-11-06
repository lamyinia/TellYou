/* eslint-disable */

/**
 * IO工具类 - 处理文件读取等IO操作
 * @author lanye
 * @date 2025/11/06
 */

export interface FileReadOptions {
  chunkSize?: number // 分块大小，默认64KB
  onProgress?: (progress: number) => void // 进度回调
}

/**
 * IO工具类
 */
class IOUtil {
  private readonly DEFAULT_CHUNK_SIZE = 64 * 1024 // 默认64KB分块

  /**
   * 分块读取文件，避免阻塞渲染进程
   * @param file 要读取的文件
   * @param options 读取选项
   * @returns Promise<ArrayBuffer> 文件内容
   */
  public readFileInChunks(file: File, options: FileReadOptions = {}): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE
      const chunks: Uint8Array[] = []
      let offset = 0

      const readNextChunk = () => {
        const slice = file.slice(offset, offset + chunkSize)
        const reader = new FileReader()

        reader.onload = (e) => {
          const result = e.target?.result as ArrayBuffer
          if (result) {
            chunks.push(new Uint8Array(result))
            offset += chunkSize
            if (options.onProgress) {
              const progress = Math.min(100, Math.round((offset / file.size) * 100))
              options.onProgress(progress)
            }
            if (offset < file.size) {
              // 使用 setTimeout 让出控制权，避免阻塞UI
              setTimeout(readNextChunk, 0)
            } else {
              const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
              const combined = new Uint8Array(totalLength)
              let position = 0
              for (const chunk of chunks) {
                combined.set(chunk, position)
                position += chunk.length
              }
              resolve(combined.buffer)
            }
          }
        }

        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(slice)
      }

      readNextChunk()
    })
  }

  /**
   * 格式化文件大小显示
   * @param bytes 字节数
   * @returns 格式化后的文件大小字符串
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  /**
   * 检测文件的媒体类型
   * @param file 文件对象
   * @returns 媒体类型字符串
   */
  public detectMediaType(file: File): string {
    const mimeType = file.type.toLowerCase()
    const fileName = file.name.toLowerCase()
    
    if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|avif)$/.test(fileName)) {
      return 'image'
    }
    if (mimeType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(fileName)) {
      return 'video'
    }
    if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(fileName)) {
      return 'voice'
    }
    return 'file'
  }

  /**
   * 批量读取文件
   * @param files 文件数组
   * @param options 读取选项
   * @returns Promise<ArrayBuffer[]> 文件内容数组
   */
  public async readFilesInChunks(files: File[], options: FileReadOptions = {}): Promise<ArrayBuffer[]> {
    const results: ArrayBuffer[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileOptions = {
        ...options,
        onProgress: options.onProgress ? (progress: number) => {
          // 计算总体进度：当前文件进度 + 已完成文件数
          const totalProgress = Math.round(((i + progress / 100) / files.length) * 100)
          options.onProgress!(totalProgress)
        } : undefined
      }
      
      const buffer = await this.readFileInChunks(file, fileOptions)
      results.push(buffer)
    }
    
    return results
  }

  /**
   * 验证文件类型
   * @param file 文件对象
   * @param allowedTypes 允许的文件类型数组
   * @returns boolean 是否为允许的类型
   */
  public validateFileType(file: File, allowedTypes: string[]): boolean {
    const mediaType = this.detectMediaType(file)
    return allowedTypes.includes(mediaType)
  }

  /**
   * 验证文件大小
   * @param file 文件对象
   * @param maxSize 最大文件大小（字节）
   * @returns boolean 是否在大小限制内
   */
  public validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize
  }
}

// 创建并导出实例
const ioUtil = new IOUtil()

// 导出实例
export default ioUtil

// 为了向后兼容，也导出函数形式
export const readFileInChunks = (file: File, options: FileReadOptions = {}) => 
  ioUtil.readFileInChunks(file, options)

export const formatFileSize = (bytes: number) => 
  ioUtil.formatFileSize(bytes)

export const detectMediaType = (file: File) => 
  ioUtil.detectMediaType(file)