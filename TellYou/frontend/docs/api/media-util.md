# MediaUtil 媒体处理工具文档

## 概述

`MediaUtil` 是一个基于 Node.js 的媒体文件处理工具类，提供图片、视频、音频的压缩、缩略图生成等功能。该工具集成了 `sharp`（图片处理）和 `fluent-ffmpeg`（音视频处理）库，为 TellYou 项目提供完整的媒体处理解决方案。

## 功能特性

- 🖼️ **图片处理**：支持 JPEG、PNG、WebP、AVIF、GIF 格式的压缩和转换
- 🎬 **视频处理**：支持 MP4、WebM 格式的压缩和缩略图生成
- 🎵 **音频处理**：支持 MP3、WAV 格式的压缩
- 📱 **响应式处理**：自动生成不同尺寸的缩略图和预览图
- ⚡ **高性能**：使用现代编解码器（AV1、H.264）优化处理效率
- 🛡️ **错误处理**：完善的异常处理和资源清理机制

## 安装依赖

```bash
npm install sharp fluent-ffmpeg
```

## 核心接口

### MediaFile 接口

```typescript
export interface MediaFile {
  buffer: Buffer        // 文件二进制数据
  mimeType: string      // MIME 类型
  originalName: string  // 原始文件名
  size: number          // 文件大小（字节）
}
```

### CompressionResult 接口

```typescript
export interface CompressionResult {
  compressedBuffer: Buffer    // 压缩后的二进制数据
  compressedSize: number      // 压缩后大小
  compressionRatio: number   // 压缩率（百分比）
  newMimeType: string         // 新的 MIME 类型
  newSuffix: string          // 新的文件后缀
}
```

### ThumbnailResult 接口

```typescript
export interface ThumbnailResult {
  thumbnailBuffer: Buffer                    // 缩略图二进制数据
  thumbnailSize: number                     // 缩略图大小
  dimensions: { width: number; height: number }  // 缩略图尺寸
}
```

## 主要方法

### 1. 图片处理

#### processImage()

处理图片文件，支持静态图片和动图。

```typescript
async processImage(mediaFile: MediaFile, strategy: 'thumb' | 'original'): Promise<CompressionResult>
```

**参数：**
- `mediaFile`: 媒体文件对象
- `strategy`: 处理策略
  - `'thumb'`: 生成缩略图（300px，AVIF 格式）
  - `'original'`: 处理原图（最大1920px，保持原格式或转换为 WebP/JPEG）

**示例：**
```typescript
const mediaFile = await mediaUtil.getNormal('/path/to/image.jpg')
const result = await mediaUtil.processImage(mediaFile, 'thumb')
console.log(`压缩率: ${result.compressionRatio.toFixed(2)}%`)
```

#### processStaticThumbnail()

生成静态图片缩略图。

```typescript
async processStaticThumbnail(mediaFile: MediaFile): Promise<CompressionResult>
```

**特性：**
- 输出格式：AVIF
- 最大尺寸：300px
- 质量：80%
- 使用 `fit: 'cover'` 保持宽高比

#### processStaticOriginal()

处理静态图片原图。

```typescript
async processStaticOriginal(mediaFile: MediaFile): Promise<CompressionResult>
```

**处理逻辑：**
- PNG → WebP（质量90%）
- JPEG → JPEG（质量90%，渐进式）
- AVIF → AVIF（质量90%）
- 其他格式 → JPEG（质量90%）

### 2. 动图处理

#### processMotion()

处理动图（GIF、WebP、AVIF）。

```typescript
async processMotion(mediaFile: MediaFile, strategy: 'thumb' | 'original'): Promise<CompressionResult>
```

**技术实现：**
- 使用 FFmpeg 的 `libaom-av1` 编码器
- 输出格式：AVIF
- 支持缩略图和原图两种策略

**FFmpeg 参数：**
```bash
-c:v libaom-av1          # AV1 编码器
-b:v 0                   # 可变码率
-crf 63/50               # 质量参数（缩略图63，原图50）
-cpu-used 8              # CPU 使用级别
-threads 0               # 使用所有可用线程
-pix_fmt yuv420p         # 像素格式
-movflags +faststart     # 快速启动
-vsync cfr               # 恒定帧率
```

### 3. 视频处理

#### compressVideo()

压缩视频文件。

```typescript
async compressVideo(mediaFile: MediaFile): Promise<CompressionResult>
```

**压缩参数：**
- 最大分辨率：1280px
- 视频码率：1000k
- 音频码率：128k
- 编码器：H.264 (libx264)
- CRF：23（高质量）
- 预设：fast（平衡速度和质量）

#### generateVideoThumbnail()

生成视频缩略图。

```typescript
async generateVideoThumbnail(mediaFile: MediaFile): Promise<ThumbnailResult>
```

**特性：**
- 随机时间点截图
- 尺寸：300px
- 格式：JPEG

#### getVideoInfo()

获取视频信息。

```typescript
async getVideoInfo(mediaFile: MediaFile): Promise<VideoInfo>
```

**返回信息：**
```typescript
interface VideoInfo {
  duration: number    // 时长（秒）
  width: number       // 宽度
  height: number      // 高度
  bitrate: number     // 码率
  codec: string       // 编码格式
}
```

### 4. 音频处理

#### compressAudio()

压缩音频文件。

```typescript
async compressAudio(mediaFile: MediaFile): Promise<CompressionResult>
```

**压缩参数：**
- 码率：128k
- 格式：MP3
- 编码器：libmp3lame

### 5. 工具方法

#### needsCompression()

检查文件是否需要压缩。

```typescript
needsCompression(mimeType: string): boolean
```

**不压缩的文件类型：**
- PDF、Word、PowerPoint、Excel 文档
- ZIP、RAR、7Z 压缩包
- TXT、JSON、XML 文本文件

#### isMotionImage()

检查是否为动图。

```typescript
isMotionImage(mimeType: string): boolean
```

**动图类型：**
- `image/gif`
- `image/webp`
- `image/avif`

## Fluent-FFmpeg 最佳实践

### 1. 内存优化

**问题：** FFmpeg 处理大文件时可能占用大量内存。

**解决方案：**
```typescript
// ✅ 使用临时文件而非内存流
const tempInputPath = path.join(urlUtil.tempPath, `input_${Date.now()}.mp4`)
const tempOutputPath = path.join(urlUtil.tempPath, `output_${Date.now()}.mp4`)

await fs.writeFile(tempInputPath, buffer)
// 处理完成后立即清理
await fs.unlink(tempInputPath).catch(() => {})
await fs.unlink(tempOutputPath).catch(() => {})
```

### 2. 错误处理

**完善的错误处理机制：**
```typescript
ffmpeg(tempInputPath)
  .on('start', (commandLine) => {
    console.log('FFmpeg 命令:', commandLine)
  })
  .on('progress', (progress) => {
    console.log(`处理进度: ${progress.percent?.toFixed(2)}%`)
  })
  .on('end', async () => {
    try {
      const result = await fs.readFile(tempOutputPath)
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
  .on('error', (err) => {
    console.error('FFmpeg 错误详情:', err.message)
    reject(err)
  })
```

### 3. 性能优化

**并发控制：**
```typescript
// 限制同时处理的视频数量
const MAX_CONCURRENT_VIDEOS = 3
const semaphore = new Semaphore(MAX_CONCURRENT_VIDEOS)

async processVideoWithLimit(mediaFile: MediaFile) {
  await semaphore.acquire()
  try {
    return await this.compressVideo(mediaFile)
  } finally {
    semaphore.release()
  }
}
```

**编码器选择：**
```typescript
// 视频编码器优先级
const VIDEO_CODECS = [
  'libx264',    // 兼容性最好
  'libx265',    // 压缩率更高
  'libaom-av1' // 最新标准，压缩率最高
]

// 音频编码器
const AUDIO_CODECS = [
  'libmp3lame',  // MP3
  'aac',         // AAC
  'libopus'      // Opus
]
```

### 4. 资源管理

**临时文件管理：**
```typescript
class TempFileManager {
  private tempFiles: Set<string> = new Set()
  
  async createTempFile(prefix: string, suffix: string): Promise<string> {
    const tempPath = path.join(urlUtil.tempPath, `${prefix}_${Date.now()}${suffix}`)
    this.tempFiles.add(tempPath)
    return tempPath
  }
  
  async cleanup() {
    const cleanupPromises = Array.from(this.tempFiles).map(file => 
      fs.unlink(file).catch(() => {})
    )
    await Promise.all(cleanupPromises)
    this.tempFiles.clear()
  }
}
```

### 5. 配置优化

**FFmpeg 全局配置：**
```typescript
// 设置 FFmpeg 路径（如果使用静态二进制文件）
import ffmpegStatic from 'ffmpeg-static'
ffmpeg.setFfmpegPath(ffmpegStatic)

// 设置超时时间
ffmpeg.setTimeout(300000) // 5分钟

// 设置并发限制
ffmpeg.setConcurrency(2)
```

### 6. 监控和日志

**处理监控：**
```typescript
class MediaProcessingMonitor {
  private activeJobs = new Map<string, { startTime: number, type: string }>()
  
  startJob(jobId: string, type: string) {
    this.activeJobs.set(jobId, { startTime: Date.now(), type })
  }
  
  endJob(jobId: string) {
    const job = this.activeJobs.get(jobId)
    if (job) {
      const duration = Date.now() - job.startTime
      console.log(`任务 ${jobId} (${job.type}) 完成，耗时: ${duration}ms`)
      this.activeJobs.delete(jobId)
    }
  }
  
  getActiveJobs() {
    return Array.from(this.activeJobs.entries())
  }
}
```

## 使用示例

### 完整处理流程

```typescript
import { mediaUtil } from '@main/util/media-util'

async function processMediaFile(filePath: string) {
  try {
    // 1. 获取文件信息
    const mediaFile = await mediaUtil.getNormal(filePath)
    console.log(`文件大小: ${(mediaFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    // 2. 检查是否需要压缩
    if (!mediaUtil.needsCompression(mediaFile.mimeType)) {
      console.log('文件类型不需要压缩')
      return mediaFile
    }
    
    // 3. 根据类型处理
    let result: CompressionResult
    
    if (mediaFile.mimeType.startsWith('image/')) {
      if (mediaUtil.isMotionImage(mediaFile.mimeType)) {
        result = await mediaUtil.processMotion(mediaFile, 'original')
      } else {
        result = await mediaUtil.processStaticOriginal(mediaFile)
      }
    } else if (mediaFile.mimeType.startsWith('video/')) {
      result = await mediaUtil.compressVideo(mediaFile)
      
      // 生成缩略图
      const thumbnail = await mediaUtil.generateVideoThumbnail(mediaFile)
      console.log(`缩略图大小: ${thumbnail.thumbnailSize} bytes`)
    } else if (mediaFile.mimeType.startsWith('audio/')) {
      result = await mediaUtil.compressAudio(mediaFile)
    } else {
      throw new Error(`不支持的文件类型: ${mediaFile.mimeType}`)
    }
    
    // 4. 输出结果
    console.log(`压缩率: ${result.compressionRatio.toFixed(2)}%`)
    console.log(`新格式: ${result.newMimeType}`)
    
    return result
    
  } catch (error) {
    console.error('媒体处理失败:', error.message)
    throw error
  }
}
```

### 批量处理

```typescript
async function batchProcessMedia(files: string[]) {
  const results = await Promise.allSettled(
    files.map(file => processMediaFile(file))
  )
  
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  console.log(`处理完成: 成功 ${successful} 个，失败 ${failed} 个`)
  
  return results
}
```

## 注意事项

1. **临时文件清理**：确保在处理完成后清理所有临时文件
2. **内存管理**：大文件处理时使用临时文件而非内存流
3. **错误处理**：为所有异步操作添加适当的错误处理
4. **并发控制**：限制同时处理的文件数量，避免资源耗尽
5. **格式兼容性**：某些格式转换可能失败，需要降级处理
6. **性能监控**：监控处理时间和资源使用情况

## 故障排除

### 常见问题

1. **FFmpeg 未找到**
   ```bash
   # 安装 FFmpeg
   # Windows: 下载并添加到 PATH
   # macOS: brew install ffmpeg
   # Linux: apt-get install ffmpeg
   ```

2. **内存不足**
   - 减少并发处理数量
   - 使用临时文件而非内存流
   - 增加系统内存或使用交换空间

3. **处理超时**
   - 增加 FFmpeg 超时时间
   - 优化编码参数
   - 使用更快的编码预设

4. **格式不支持**
   - 检查输入文件格式
   - 更新 FFmpeg 版本
   - 添加格式转换降级方案

## 更新日志

- **v1.0.0** (2025-09-29): 初始版本，支持基本的图片、视频、音频处理
- 支持 AVIF 格式输出
- 集成 Sharp 和 Fluent-FFmpeg
- 完善的错误处理和资源清理机制
