import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs'
import { createHash } from 'crypto'
import axios from 'axios'
import log from 'electron-log'

interface AvatarInfo {
  userId: string
  hash: string
  localPaths: Record<string, string> // size -> filePath
  updatedAt: number
}

interface CacheIndex {
  [userId: string]: AvatarInfo
}

class AvatarCacheService {
  private cacheIndex: CacheIndex = {}
  private downloading = new Set<string>() // 防止重复下载
  private readonly maxCacheSize = 200 * 1024 * 1024 // 200MB
  private readonly maxCacheFiles = 1000
  private readonly cacheExpireTime = 7 * 24 * 60 * 60 * 1000 // 7天

  constructor() {
    this.ensureCacheDir()
    this.loadIndex()
    this.startCleanupTimer()
  }

  private getCacheDir(): string {
    return join(app.getPath('userData'), '.tellyou', 'cache', 'avatar')
  }

  private getIndexFile(): string {
    return join(this.getCacheDir(), 'index.json')
  }

  private ensureCacheDir(): void {
    const dir = this.getCacheDir()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }

  private loadIndex(): void {
    try {
      const indexFile = this.getIndexFile()
      if (existsSync(indexFile)) {
        const data = readFileSync(indexFile, 'utf-8')
        this.cacheIndex = JSON.parse(data) || {}
        log.info('Avatar cache index loaded:', Object.keys(this.cacheIndex).length, 'users')
      }
    } catch (error) {
      log.error('Failed to load avatar cache index:', error)
      this.cacheIndex = {}
    }
  }

  private saveIndex(): void {
    try {
      console.log('缓存映射', this.getIndexFile())
      writeFileSync(this.getIndexFile(), JSON.stringify(this.cacheIndex, null, 2))
    } catch (error) {
      log.error('Failed to save avatar cache index:', error)
    }
  }

  private getCacheKey(userId: string, hash: string, size: number): string {
    return `${userId}_${size}_${hash}`
  }

  private getFilePath(userId: string, hash: string, size: number): string {
    const hashPrefix = hash.substring(0, 2)
    const subDir = join(this.getCacheDir(), hashPrefix)
    if (!existsSync(subDir)) {
      mkdirSync(subDir, { recursive: true })
    }
    return join(subDir, `avatar_${userId}_${size}_${hash}.jpg`)
  }

  private extractHashFromUrl(url: string): string {
    // 从URL中提取hash，支持 ?v=hash 或 /hash.jpg 格式
    const urlObj = new URL(url)
    const version = urlObj.searchParams.get('v')
    if (version) return version

    const pathParts = urlObj.pathname.split('/')
    const filename = pathParts[pathParts.length - 1]
    const match = filename.match(/([a-f0-9]{8,})/)
    return match ? match[1] : createHash('md5').update(url).digest('hex').substring(0, 8)
  }

  private async downloadAvatar(url: string, filePath: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'TellYou-Client/1.0'
        }
      })
      if (response.status === 200 && response.data) {
        writeFileSync(filePath, response.data)
        return true
      }
      return false
    } catch (error) {
      log.error('Failed to download avatar:', url, error)
      return false
    }
  }

  private cleanupOldCache(): void {
    try {
      const now = Date.now()
      const files: Array<{ path: string; mtime: number; size: number }> = []

      // 收集所有缓存文件信息
      const scanDir = (dir: string) => {
        if (!existsSync(dir)) return
        const items = readdirSync(dir)
        for (const item of items) {
          const itemPath = join(dir, item)
          const stat = statSync(itemPath)
          if (stat.isDirectory()) {
            scanDir(itemPath)
          } else if (item.startsWith('avatar_') && item.endsWith('.jpg')) {
            files.push({ path: itemPath, mtime: stat.mtime.getTime(), size: stat.size })
          }
        }
      }

      scanDir(this.getCacheDir())

      // 按修改时间排序，删除最旧的
      files.sort((a, b) => a.mtime - b.mtime)

      let totalSize = files.reduce((sum, f) => sum + f.size, 0)
      let deletedCount = 0

      for (const file of files) {
        if (totalSize <= this.maxCacheSize && files.length - deletedCount <= this.maxCacheFiles) {
          break
        }

        try {
          unlinkSync(file.path)
          totalSize -= file.size
          deletedCount++
        } catch (error) {
          log.warn('Failed to delete cache file:', file.path, error)
        }
      }

      // 清理过期的索引项
      for (const [userId, info] of Object.entries(this.cacheIndex)) {
        if (now - info.updatedAt > this.cacheExpireTime) {
          delete this.cacheIndex[userId]
        }
      }
      if (deletedCount > 0) {
        log.info('Avatar cache cleanup:', deletedCount, 'files deleted')
        this.saveIndex()
      }
    } catch (error) {
      log.error('Avatar cache cleanup failed:', error)
    }
  }

  private startCleanupTimer(): void {
    // 每小时清理一次
    setInterval(() => {
      this.cleanupOldCache()
    }, 60 * 60 * 1000)
  }

  async getAvatar(userId: string, avatarUrl: string, size: number = 48): Promise<string | null> {
    if (!avatarUrl || !userId) return null
    const hash = this.extractHashFromUrl(avatarUrl)
    const cacheKey = this.getCacheKey(userId, hash, size)
    const filePath = this.getFilePath(userId, hash, size)
    if (existsSync(filePath)) {
      const info = this.cacheIndex[userId]
      if (info && info.hash === hash && info.localPaths[size] === filePath) {
        info.updatedAt = Date.now()
        this.saveIndex()
        return filePath
      }
    }
    // 防止重复下载
    if (this.downloading.has(cacheKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.downloading.has(cacheKey)) {
            clearInterval(checkInterval)
            resolve(existsSync(filePath) ? filePath : null)
          }
        }, 100)
      })
    }
    this.downloading.add(cacheKey)
    try {
      const success = await this.downloadAvatar(avatarUrl, filePath)
      if (success) {
        if (!this.cacheIndex[userId]) {
          this.cacheIndex[userId] = {
            userId,
            hash,
            localPaths: {},
            updatedAt: Date.now()
          }
        }
        this.cacheIndex[userId].hash = hash
        this.cacheIndex[userId].localPaths[size] = filePath
        this.cacheIndex[userId].updatedAt = Date.now()
        this.saveIndex()

        return filePath
      }
    } catch (error) {
      log.error('Avatar download failed:', userId, avatarUrl, error)
    } finally {
      this.downloading.delete(cacheKey)
    }
    return null
  }

  async preloadAvatars(avatarMap: Record<string, string>, size: number = 48): Promise<void> {
    const promises = Object.entries(avatarMap).map(([userId, avatarUrl]) =>
      this.getAvatar(userId, avatarUrl, size)
    )
    await Promise.allSettled(promises)
  }

  clearUserCache(userId: string): void {
    const info = this.cacheIndex[userId]
    if (info) {
      // 删除文件
      Object.values(info.localPaths).forEach(filePath => {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath)
          }
        } catch (error) {
          log.warn('Failed to delete avatar file:', filePath, error)
        }
      })
      // 删除索引
      delete this.cacheIndex[userId]
      this.saveIndex()
    }
  }

  getCacheStats(): { totalUsers: number; totalFiles: number; totalSize: number } {
    let totalFiles = 0
    let totalSize = 0

    const scanDir = (dir: string) => {
      if (!existsSync(dir)) return
      const items = readdirSync(dir)
      for (const item of items) {
        const itemPath = join(dir, item)
        const stat = statSync(itemPath)
        if (stat.isDirectory()) {
          scanDir(itemPath)
        } else if (item.startsWith('avatar_') && item.endsWith('.jpg')) {
          totalFiles++
          totalSize += stat.size
        }
      }
    }

    scanDir(this.getCacheDir())

    return {
      totalUsers: Object.keys(this.cacheIndex).length,
      totalFiles,
      totalSize
    }
  }
}

// 单例
export const avatarCacheService = new AvatarCacheService()
