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

## 其他 API 文档

- [Electron APIs](./electron-apis.md) - Electron 相关 API 使用说明

## 快速开始

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

- **图片处理**: Sharp
- **音视频处理**: Fluent-FFmpeg
- **编码格式**: AV1, H.264, H.265
- **输出格式**: AVIF, WebP, MP4, MP3

## 更新日志

- **2025-01-10**: 创建 MediaUtil 和 Fluent-FFmpeg 文档
- 基于项目实际代码整理最佳实践
- 补充生产环境部署建议
