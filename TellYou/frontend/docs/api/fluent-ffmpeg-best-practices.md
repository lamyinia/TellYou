# Fluent-FFmpeg 高级用法与最佳实践

## 概述

本文档基于 TellYou 项目中的 `media-util.ts` 实现，总结了 `fluent-ffmpeg` 在生产环境中的最佳实践和高级用法。

## 1. 性能优化策略

### 1.1 编码器选择与参数优化

#### 视频编码器对比

| 编码器 | 压缩率 | 编码速度 | 兼容性 | 推荐场景 |
|--------|--------|----------|--------|----------|
| libx264 | 中等 | 快 | 最好 | 通用视频处理 |
| libx265 | 高 | 慢 | 好 | 存储优化 |
| libaom-av1 | 最高 | 最慢 | 一般 | 现代浏览器 |

#### 优化后的编码参数

```typescript
// 高质量视频压缩（项目当前使用）
const HIGH_QUALITY_CONFIG = {
  videoCodec: 'libx264',
  crf: 23,                    // 23-28 为高质量范围
  preset: 'fast',             // fast, medium, slow
  profile: 'high',
  level: '4.1',
  pixelFormat: 'yuv420p',
  movflags: '+faststart'      // Web 优化
}

// 高压缩率配置
const HIGH_COMPRESSION_CONFIG = {
  videoCodec: 'libx265',
  crf: 28,                    // H.265 的 CRF 范围更大
  preset: 'medium',
  tune: 'zerolatency',        // 低延迟优化
  pixelFormat: 'yuv420p10le' // 10位色深
}

// AV1 编码配置（项目动图处理使用）
const AV1_CONFIG = {
  videoCodec: 'libaom-av1',
  crf: 50,                    // AV1 的 CRF 范围 0-63
  cpuUsed: 4,                 // 0-8，数值越大速度越快质量越低
  threads: 0,                 // 使用所有可用线程
  pixelFormat: 'yuv420p'
}
```

### 1.2 音频编码优化

```typescript
// 高质量音频配置
const AUDIO_CONFIG = {
  codec: 'aac',               // 或 'libmp3lame'
  bitrate: '128k',            // 128k 为平衡点
  sampleRate: 44100,          // 标准采样率
  channels: 2,                // 立体声
  profile: 'aac_low'          // AAC 低复杂度配置
}

// 高压缩音频配置
const COMPRESSED_AUDIO_CONFIG = {
  codec: 'libopus',
  bitrate: '96k',             // Opus 在低码率下表现更好
  sampleRate: 48000,          // Opus 推荐采样率
  channels: 2,
  application: 'voip'         // 语音优化
}
```

### 1.3 内存和 CPU 优化

```typescript
class OptimizedFFmpegProcessor {
  private readonly maxConcurrentJobs = 2
  private readonly tempDir = path.join(process.cwd(), 'temp')
  private activeJobs = new Set<string>()
  
  async processWithOptimization(inputBuffer: Buffer, config: any): Promise<Buffer> {
    // 1. 并发控制
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      await this.waitForSlot()
    }
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.activeJobs.add(jobId)
    
    try {
      // 2. 临时文件管理
      const tempInput = await this.createTempFile('input', '.mp4')
      const tempOutput = await this.createTempFile('output', '.mp4')
      
      // 3. 分块写入大文件
      await this.writeBufferInChunks(inputBuffer, tempInput)
      
      // 4. 优化的 FFmpeg 处理
      const result = await this.runOptimizedFFmpeg(tempInput, tempOutput, config)
      
      return result
    } finally {
      this.activeJobs.delete(jobId)
      await this.cleanupTempFiles([tempInput, tempOutput])
    }
  }
  
  private async writeBufferInChunks(buffer: Buffer, filePath: string, chunkSize = 1024 * 1024) {
    const fd = await fs.open(filePath, 'w')
    try {
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const chunk = buffer.slice(offset, offset + chunkSize)
        await fd.write(chunk, 0, chunk.length, offset)
      }
    } finally {
      await fd.close()
    }
  }
}
```

## 2. 错误处理与重试机制

### 2.1 完善的错误处理

```typescript
interface FFmpegError extends Error {
  code?: string
  signal?: string
  killed?: boolean
  cmd?: string
}

class RobustFFmpegProcessor {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000
  
  async processWithRetry(inputPath: string, outputPath: string, config: any): Promise<Buffer> {
    let lastError: FFmpegError | null = null
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.processVideo(inputPath, outputPath, config)
      } catch (error) {
        lastError = error as FFmpegError
        console.warn(`处理失败 (尝试 ${attempt}/${this.maxRetries}):`, error.message)
        
        // 分析错误类型
        if (this.isRetryableError(error)) {
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt)
            continue
          }
        } else {
          // 不可重试的错误，直接抛出
          throw error
        }
      }
    }
    
    throw new Error(`处理失败，已重试 ${this.maxRetries} 次: ${lastError?.message}`)
  }
  
  private isRetryableError(error: any): boolean {
    // 可重试的错误类型
    const retryableErrors = [
      'ENOSPC',      // 磁盘空间不足
      'EMFILE',      // 文件描述符过多
      'ENOMEM',      // 内存不足
      'ETIMEDOUT'    // 超时
    ]
    
    return retryableErrors.some(code => 
      error.code === code || error.message.includes(code)
    )
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 2.2 进度监控与取消机制

```typescript
class CancellableFFmpegProcessor {
  private activeProcesses = new Map<string, ffmpeg.FfmpegCommand>()
  
  async processWithCancellation(
    inputPath: string, 
    outputPath: string, 
    config: any,
    onProgress?: (progress: any) => void
  ): Promise<Buffer> {
    const processId = `process_${Date.now()}`
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg 命令:', cmd)
        })
        .on('progress', (progress) => {
          if (onProgress) {
            onProgress({
              percent: progress.percent,
              time: progress.timemark,
              speed: progress.currentFps,
              eta: progress.targetSize
            })
          }
        })
        .on('end', async () => {
          try {
            const result = await fs.readFile(outputPath)
            this.activeProcesses.delete(processId)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
        .on('error', (error) => {
          this.activeProcesses.delete(processId)
          reject(error)
        })
      
      this.activeProcesses.set(processId, command)
      command.run()
    })
  }
  
  cancelProcess(processId: string): boolean {
    const process = this.activeProcesses.get(processId)
    if (process) {
      process.kill('SIGTERM')
      this.activeProcesses.delete(processId)
      return true
    }
    return false
  }
  
  cancelAllProcesses(): void {
    for (const [processId, process] of this.activeProcesses) {
      process.kill('SIGTERM')
    }
    this.activeProcesses.clear()
  }
}
```

## 3. 高级功能实现

### 3.1 智能格式检测与转换

```typescript
class SmartFormatProcessor {
  private readonly formatCapabilities = {
    'video/mp4': { codec: 'libx264', container: 'mp4', webCompatible: true },
    'video/webm': { codec: 'libvpx-vp9', container: 'webm', webCompatible: true },
    'video/avi': { codec: 'libx264', container: 'mp4', webCompatible: false },
    'video/mov': { codec: 'libx264', container: 'mp4', webCompatible: false },
    'video/mkv': { codec: 'libx264', container: 'mp4', webCompatible: false }
  }
  
  async smartConvert(inputPath: string, targetFormat: string): Promise<string> {
    const inputInfo = await this.getMediaInfo(inputPath)
    const targetCapability = this.formatCapabilities[targetFormat]
    
    if (!targetCapability) {
      throw new Error(`不支持的目标格式: ${targetFormat}`)
    }
    
    // 如果已经是目标格式且兼容，直接返回
    if (inputInfo.format === targetFormat && targetCapability.webCompatible) {
      return inputPath
    }
    
    // 智能选择编码参数
    const config = this.generateOptimalConfig(inputInfo, targetCapability)
    
    const outputPath = inputPath.replace(/\.[^.]+$/, `.${targetCapability.container}`)
    await this.convertWithConfig(inputPath, outputPath, config)
    
    return outputPath
  }
  
  private generateOptimalConfig(inputInfo: any, targetCapability: any) {
    const config: any = {
      codec: targetCapability.codec,
      format: targetCapability.container
    }
    
    // 根据输入视频特性调整参数
    if (inputInfo.width > 1920 || inputInfo.height > 1080) {
      config.scale = '1920:1080'  // 4K 降级到 1080p
    }
    
    if (inputInfo.bitrate > 5000000) {  // 5Mbps
      config.crf = 28  // 高码率输入，使用较高 CRF
    } else {
      config.crf = 23  // 低码率输入，使用较低 CRF
    }
    
    return config
  }
}
```

### 3.2 批量处理与队列管理

```typescript
interface ProcessingJob {
  id: string
  inputPath: string
  outputPath: string
  config: any
  priority: number
  createdAt: Date
}

class FFmpegQueueManager {
  private queue: ProcessingJob[] = []
  private processing = new Map<string, ProcessingJob>()
  private readonly maxConcurrent = 2
  private readonly maxQueueSize = 100
  
  async addJob(job: Omit<ProcessingJob, 'id' | 'createdAt'>): Promise<string> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('队列已满，请稍后重试')
    }
    
    const fullJob: ProcessingJob = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    }
    
    // 按优先级插入队列
    this.insertByPriority(fullJob)
    
    // 尝试处理队列
    this.processQueue()
    
    return fullJob.id
  }
  
  private insertByPriority(job: ProcessingJob) {
    const index = this.queue.findIndex(q => q.priority < job.priority)
    if (index === -1) {
      this.queue.push(job)
    } else {
      this.queue.splice(index, 0, job)
    }
  }
  
  private async processQueue() {
    if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
      return
    }
    
    const job = this.queue.shift()!
    this.processing.set(job.id, job)
    
    try {
      await this.processJob(job)
    } catch (error) {
      console.error(`任务 ${job.id} 处理失败:`, error)
    } finally {
      this.processing.delete(job.id)
      // 继续处理队列
      setImmediate(() => this.processQueue())
    }
  }
  
  private async processJob(job: ProcessingJob): Promise<void> {
    // 实际的 FFmpeg 处理逻辑
    console.log(`开始处理任务 ${job.id}`)
    // ... 处理逻辑
  }
  
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize
    }
  }
}
```

## 4. 监控与诊断

### 4.1 性能监控

```typescript
class FFmpegPerformanceMonitor {
  private metrics = {
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    peakMemoryUsage: 0,
    currentMemoryUsage: 0
  }
  
  startJob(jobId: string, inputSize: number) {
    this.metrics.totalJobs++
    console.log(`开始处理任务 ${jobId}, 输入大小: ${(inputSize / 1024 / 1024).toFixed(2)}MB`)
  }
  
  endJob(jobId: string, success: boolean, processingTime: number, outputSize: number) {
    if (success) {
      this.metrics.successfulJobs++
      this.metrics.totalProcessingTime += processingTime
      this.metrics.averageProcessingTime = 
        this.metrics.totalProcessingTime / this.metrics.successfulJobs
      
      const compressionRatio = (1 - outputSize / inputSize) * 100
      console.log(`任务 ${jobId} 完成: 耗时 ${processingTime}ms, 压缩率 ${compressionRatio.toFixed(2)}%`)
    } else {
      this.metrics.failedJobs++
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalJobs > 0 ? 
        (this.metrics.successfulJobs / this.metrics.totalJobs) * 100 : 0
    }
  }
  
  resetMetrics() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = 0
    })
  }
}
```

### 4.2 资源使用监控

```typescript
class ResourceMonitor {
  private readonly checkInterval = 5000  // 5秒检查一次
  private isMonitoring = false
  
  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    this.monitorLoop()
  }
  
  private async monitorLoop() {
    while (this.isMonitoring) {
      try {
        const stats = await this.getSystemStats()
        this.logResourceUsage(stats)
        
        // 如果资源使用过高，发出警告
        if (stats.memoryUsage > 0.9 || stats.cpuUsage > 0.8) {
          console.warn('系统资源使用率过高:', stats)
        }
      } catch (error) {
        console.error('资源监控错误:', error)
      }
      
      await this.delay(this.checkInterval)
    }
  }
  
  private async getSystemStats() {
    const memUsage = process.memoryUsage()
    const cpuUsage = await this.getCpuUsage()
    
    return {
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      cpuUsage,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external
    }
  }
  
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage()
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage)
        const totalUsage = endUsage.user + endUsage.system
        const totalTime = 1000000  // 1秒 = 1,000,000 微秒
        resolve(totalUsage / totalTime)
      }, 1000)
    })
  }
}
```

## 5. 生产环境部署建议

### 5.1 Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装 FFmpeg
RUN apk add --no-cache ffmpeg

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建临时目录
RUN mkdir -p /app/temp && chmod 777 /app/temp

# 设置环境变量
ENV NODE_ENV=production
ENV TEMP_DIR=/app/temp

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

### 5.2 环境变量配置

```bash
# .env
NODE_ENV=production
TEMP_DIR=/app/temp
MAX_CONCURRENT_JOBS=2
MAX_QUEUE_SIZE=100
FFMPEG_TIMEOUT=300000
LOG_LEVEL=info
```

### 5.3 健康检查

```typescript
class HealthChecker {
  async checkFFmpegHealth(): Promise<boolean> {
    try {
      const tempFile = path.join(process.cwd(), 'temp', 'health_check.mp4')
      const testBuffer = Buffer.from('test')
      
      await fs.writeFile(tempFile, testBuffer)
      
      // 尝试运行简单的 FFmpeg 命令
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempFile)
          .outputOptions(['-f', 'null'])
          .on('end', resolve)
          .on('error', reject)
          .run()
      })
      
      await fs.unlink(tempFile).catch(() => {})
      return true
    } catch (error) {
      console.error('FFmpeg 健康检查失败:', error)
      return false
    }
  }
  
  async getSystemHealth() {
    const ffmpegHealthy = await this.checkFFmpegHealth()
    const diskSpace = await this.getDiskSpace()
    const memoryUsage = process.memoryUsage()
    
    return {
      ffmpeg: ffmpegHealthy,
      diskSpace: diskSpace.free / diskSpace.total,
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  }
}
```

## 6. 总结

通过以上最佳实践，可以显著提升 `fluent-ffmpeg` 在生产环境中的性能和稳定性：

1. **性能优化**：选择合适的编码器和参数
2. **错误处理**：完善的重试机制和错误分类
3. **资源管理**：内存优化和并发控制
4. **监控诊断**：实时监控和健康检查
5. **生产部署**：Docker 化和环境配置

这些实践已经在 TellYou 项目的 `media-util.ts` 中得到部分应用，可以根据实际需求进一步完善和扩展。
