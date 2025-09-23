# Electron 应用文件权限和路径管理详解

## 问题解答

### 1. 打包上线后的文件权限

#### ✅ 权限保持
打包后的 Electron 应用**仍然具有**修改本地文件系统的权限，包括：

- **AppData/Roaming 目录**: 完全读写权限
- **用户文档目录**: 读写权限
- **临时目录**: 读写权限
- **应用安装目录**: 只读权限（除非以管理员身份运行）

#### 📁 具体权限范围

```typescript
// 这些路径在打包后仍然可写
app.getPath('userData')     // ✅ 可写 - 用户数据目录
app.getPath('documents')    // ✅ 可写 - 用户文档目录  
app.getPath('downloads')    // ✅ 可写 - 下载目录
app.getPath('temp')         // ✅ 可写 - 临时目录
app.getPath('home')         // ✅ 可写 - 用户主目录
app.getPath('appData')      // ✅ 可写 - 应用数据目录
app.getPath('userCache')    // ✅ 可写 - 用户缓存目录

// 这些路径在打包后只读
app.getPath('exe')          // ❌ 只读 - 可执行文件路径
app.getPath('module')       // ❌ 只读 - 模块路径
app.getPath('resources')    // ❌ 只读 - 资源文件路径
```

#### 🔒 安全限制
- **沙盒模式**: 如果启用 `sandbox: true`，文件系统访问会被严格限制
- **代码签名**: 某些系统可能要求代码签名才能访问特定目录
- **用户权限**: 受操作系统用户权限限制

### 2. 聊天文件资源存储策略

#### 📂 推荐的文件存储结构

```typescript
// 建议的文件存储结构
const getFileStoragePaths = () => {
  const userData = app.getPath('userData')
  
  return {
    // 头像缓存
    avatars: join(userData, '.tellyou', 'cache', 'avatar'),
    
    // 聊天图片
    images: join(userData, '.tellyou', 'files', 'images'),
    
    // 聊天视频
    videos: join(userData, '.tellyou', 'files', 'videos'),
    
    // 聊天文件
    documents: join(userData, '.tellyou', 'files', 'documents'),
    
    // 语音消息
    audio: join(userData, '.tellyou', 'files', 'audio'),
    
    // 临时文件
    temp: join(userData, '.tellyou', 'temp')
  }
}
```

#### 🎯 是否需要自定义协议？

**需要自定义协议的情况**:
- 头像显示（当前实现）
- 需要安全访问控制的文件
- 需要特殊 MIME 类型处理的文件

**不需要自定义协议的情况**:
- 用户主动下载的文件
- 临时预览文件
- 导出功能生成的文件

#### 💡 优化建议

```typescript
// 混合策略：自定义协议 + 直接文件访问
class FileManager {
  // 头像使用自定义协议（安全）
  getAvatarUrl(userId: string, avatarUrl: string): string {
    const localPath = avatarCacheService.getAvatar(userId, avatarUrl)
    return localPath ? `tellyou://avatar?path=${encodeURIComponent(localPath)}` : avatarUrl
  }
  
  // 聊天文件直接使用文件路径（性能）
  getChatFileUrl(filePath: string): string {
    return `file://${filePath}`
  }
  
  // 用户下载文件使用系统下载目录
  downloadToUserFolder(filePath: string, fileName: string): string {
    const downloadsPath = app.getPath('downloads')
    const targetPath = join(downloadsPath, fileName)
    fs.copyFileSync(filePath, targetPath)
    return targetPath
  }
}
```

### 3. 当前路径设计分析

#### 📊 当前实现分析

```typescript
// 当前实现
app.setPath('userData', app.getPath('userData') + '_' + instanceId)  // 用户数据
const baseFolder = userDir + (NODE_ENV === 'development' ? '/.tellyoudev/' : 'tellyou/')  // SQLite
```

#### ✅ 设计合理性评估

**优点**:
- 多实例支持（通过 instanceId）
- 开发/生产环境分离
- 用户数据隔离

**问题**:
- 路径不一致（userData vs homeDir）
- 缺少统一的文件管理策略
- 没有考虑跨平台兼容性

#### 🐧 Linux 兼容性

```typescript
// 当前实现在 Linux 上的表现
// Windows: C:\Users\username\AppData\Roaming\TellYou_inst123
// macOS:   /Users/username/Library/Application Support/TellYou_inst123  
// Linux:   /home/username/.config/TellYou_inst123

// SQLite 路径
// Windows: C:\Users\username\tellyou\
// macOS:   /Users/username/tellyou/
// Linux:   /home/username/tellyou/  ✅ 有效
```

**Linux 兼容性**: ✅ 完全兼容，但建议优化路径结构

#### 🔧 优化建议

```typescript
// 建议的统一路径管理
class PathManager {
  private static instance: PathManager
  private readonly instanceId: string
  
  constructor() {
    this.instanceId = process.env.ELECTRON_INSTANCE_ID || 'default'
  }
  
  // 统一的数据根目录
  getDataRoot(): string {
    return join(app.getPath('userData'), '.tellyou')
  }
  
  // SQLite 数据库路径
  getDatabasePath(userId: string): string {
    return join(this.getDataRoot(), 'database', `${userId}.db`)
  }
  
  // 缓存目录
  getCacheDir(): string {
    return join(this.getDataRoot(), 'cache')
  }
  
  // 文件存储目录
  getFilesDir(): string {
    return join(this.getDataRoot(), 'files')
  }
  
  // 日志目录
  getLogsDir(): string {
    return join(this.getDataRoot(), 'logs')
  }
  
  // 临时目录
  getTempDir(): string {
    return join(this.getDataRoot(), 'temp')
  }
}
```

### 4. 相关 API 和功能

#### 📋 Electron 文件系统 API 总览

```typescript
// 1. 应用路径管理
app.getPath(name)           // 获取系统标准路径
app.setPath(name, path)     // 设置自定义路径
app.getAppPath()            // 获取应用安装路径
app.getPath('userData')     // 用户数据目录

// 2. 文件系统操作
import fs from 'fs'
fs.readFile()               // 读取文件
fs.writeFile()              // 写入文件
fs.mkdir()                  // 创建目录
fs.stat()                   // 获取文件信息

// 3. 路径处理
import path from 'path'
path.join()                 // 路径拼接
path.resolve()              // 解析绝对路径
path.basename()             // 获取文件名
path.extname()              // 获取文件扩展名

// 4. 系统信息
import os from 'os'
os.homedir()                // 用户主目录
os.tmpdir()                 // 临时目录
os.platform()               // 操作系统平台

// 5. 文件对话框
import { dialog } from 'electron'
dialog.showOpenDialog()     // 打开文件对话框
dialog.showSaveDialog()     // 保存文件对话框

// 6. 系统集成
import { shell } from 'electron'
shell.openPath()            // 用系统默认程序打开文件
shell.showItemInFolder()    // 在文件管理器中显示文件
shell.moveItemToTrash()     // 移动到回收站
```

#### 🎯 各 API 的具体用途

| API | 用途 | 示例 |
|-----|------|------|
| `app.getPath('userData')` | 用户数据存储 | 配置、缓存、数据库 |
| `app.getPath('documents')` | 用户文档 | 导出文件、用户文件 |
| `app.getPath('downloads')` | 下载目录 | 用户下载的文件 |
| `app.getPath('temp')` | 临时文件 | 处理中的文件 |
| `os.homedir()` | 用户主目录 | 跨平台用户目录 |
| `shell.openPath()` | 打开文件 | 用系统程序打开文件 |
| `dialog.showSaveDialog()` | 文件保存 | 用户选择保存位置 |

#### 🔄 完整的文件管理示例

```typescript
// 完整的文件管理服务
class FileManagementService {
  private pathManager = new PathManager()
  
  // 初始化目录结构
  async initializeDirectories(): Promise<void> {
    const dirs = [
      this.pathManager.getDataRoot(),
      this.pathManager.getCacheDir(),
      this.pathManager.getFilesDir(),
      this.pathManager.getLogsDir(),
      this.pathManager.getTempDir()
    ]
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }
  }
  
  // 保存聊天文件
  async saveChatFile(fileData: Buffer, fileName: string, fileType: string): Promise<string> {
    const fileDir = join(this.pathManager.getFilesDir(), fileType)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    
    const filePath = join(fileDir, fileName)
    fs.writeFileSync(filePath, fileData)
    return filePath
  }
  
  // 获取文件 URL
  getFileUrl(filePath: string, fileType: string): string {
    switch (fileType) {
      case 'avatar':
        return `tellyou://avatar?path=${encodeURIComponent(filePath)}`
      case 'image':
      case 'video':
      case 'audio':
        return `file://${filePath}`
      default:
        return filePath
    }
  }
  
  // 清理临时文件
  async cleanupTempFiles(): Promise<void> {
    const tempDir = this.pathManager.getTempDir()
    const files = fs.readdirSync(tempDir)
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24小时
    
    for (const file of files) {
      const filePath = join(tempDir, file)
      const stats = fs.statSync(filePath)
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath)
      }
    }
  }
}
```

## 总结建议

1. **统一路径管理**: 使用 `app.getPath('userData')` 作为根目录
2. **分层存储**: 按文件类型分别存储（头像、图片、视频、文档）
3. **自定义协议**: 仅用于需要安全控制的文件（如头像）
4. **跨平台兼容**: 使用 Electron 提供的标准路径 API
5. **权限管理**: 合理利用 Electron 的文件系统权限
6. **清理机制**: 实现自动清理过期文件的功能

这样的设计既保证了安全性，又提供了良好的用户体验和跨平台兼容性。
