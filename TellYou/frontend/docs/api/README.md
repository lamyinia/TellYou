# TellYou 项目 API 文档

## 媒体处理相关文档

### 📁 [MediaUtil 媒体处理工具文档](./media-util.md)
- MediaUtil 类的完整使用指南
- 图片、视频、音频处理功能说明
- 接口定义和使用示例
- 项目中的实际应用场景

### 🎬 [Fluent-FFmpeg 最佳实践](./fluent-ffmpeg-best-practices.md)
- Fluent-FFmpeg 高级用法和优化策略
- 性能优化、错误处理、资源管理
- 生产环境部署建议
- 监控和诊断工具

## 网络请求相关文档

### 🌐 [NetUtil 网络工具类文档](./net-util.md)
- NetMaster 和 NetMinIO 类的完整使用指南
- HTTP 请求和文件操作功能说明
- 拦截器机制和错误处理策略
- 类型安全和最佳实践

### 📡 [Axios 最佳实践指南](./axios-best-practices.md)
- Axios 在 Electron + TypeScript 环境中的最佳实践
- 实例配置、拦截器、错误处理策略
- 性能优化、安全考虑、监控日志
- 常见陷阱和解决方案

## 其他 API 文档

- [Electron APIs](./electron-apis.md) - Electron 相关 API 使用说明

## 快速开始

### 网络请求示例

```typescript
import { netMaster, netMinIO } from '@main/util/net-util'

// HTTP 请求
const response = await netMaster.get<User[]>('/api/users')
const users = response.data.data

// 文件上传
const imageFile = new File([...], 'image.jpg', { type: 'image/jpeg' })
await netMinIO.uploadImage(presignedUrl, imageFile)

// 文件下载
const imageBlob = await netMinIO.downloadImage(imageUrl)
```

### 媒体处理示例

```typescript
import { mediaUtil } from '@main/util/media-util'

// 处理图片文件
const mediaFile = await mediaUtil.getNormal('/path/to/image.jpg')
const result = await mediaUtil.processImage(mediaFile, 'thumb')
console.log(`压缩率: ${result.compressionRatio.toFixed(2)}%`)

// 处理视频文件
const videoResult = await mediaUtil.compressVideo(mediaFile)
const thumbnail = await mediaUtil.generateVideoThumbnail(mediaFile)
```

### FFmpeg 优化配置

```typescript
// 高质量视频压缩
const config = {
  videoCodec: 'libx264',
  crf: 23,
  preset: 'fast',
  movflags: '+faststart'
}

// AV1 编码（动图处理）
const av1Config = {
  videoCodec: 'libaom-av1',
  crf: 50,
  cpuUsed: 4,
  threads: 0
}
```

## 技术栈

### 网络请求
- **HTTP 客户端**: Axios
- **类型安全**: TypeScript
- **错误处理**: 自定义 ApiError 类
- **拦截器**: 请求/响应拦截器

### 媒体处理
- **图片处理**: Sharp
- **音视频处理**: Fluent-FFmpeg
- **编码格式**: AV1, H.264, H.265
- **输出格式**: AVIF, WebP, MP4, MP3

## 更新日志

- **2025-01-10**: 创建 NetUtil 和 Axios 最佳实践文档
- **2025-01-10**: 创建 MediaUtil 和 Fluent-FFmpeg 文档
- 基于项目实际代码整理最佳实践
- 补充生产环境部署建议
