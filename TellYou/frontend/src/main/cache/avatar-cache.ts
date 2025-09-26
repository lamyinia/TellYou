import { app } from 'electron'
import { join } from 'path'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync
} from 'fs'
import { createHash } from 'crypto'
import { netMinIO } from '../util/net-util'
import log from 'electron-log'

interface AvatarInfo {
  userId: string
  hash: string
  localPaths: Record<string, string>
  updatedAt: number
}

interface CacheIndex {
  [userId: string]: AvatarInfo
}

class AvatarCacheService {
  private cacheIndex: CacheIndex = {}
  private readonly cacheDir: string
  private readonly indexFile: string
  private readonly maxCacheSize: number = 100 * 1024 * 1024 // 100MB
  private readonly maxCacheAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly maxFiles: number = 1000

  constructor() {
    this.cacheDir = join(app.getPath('userData'), 'avatar-cache')
    this.indexFile = join(this.cacheDir, 'index.json')
    this.ensureCacheDir()
    this.loadIndex()
    this.startCleanupTimer()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private loadIndex(): void {
    try {
      if (existsSync(this.indexFile)) {
        const data = readFileSync(this.indexFile, 'utf-8')
        this.cacheIndex = JSON.parse(data)
      }
    } catch (error) {
      log.error('Failed to load cache index:', error)
      this.cacheIndex = {}
    }
  }

  private saveIndex(): void {
    try {
      writeFileSync(this.indexFile, JSON.stringify(this.cacheIndex, null, 2))
    } catch (error) {
      log.error('Failed to save cache index:', error)
    }
  }

  async getAvatarPath(userId: string, avatarUrl: string): Promise<string | null> {
    if (!avatarUrl) return null

    const hash = this.generateHash(avatarUrl)
    const avatarInfo = this.cacheIndex[userId]

    if (avatarInfo && avatarInfo.hash === hash && avatarInfo.localPaths[hash]) {
      const localPath = avatarInfo.localPaths[hash]
      if (existsSync(localPath)) {
        avatarInfo.updatedAt = Date.now()
        this.saveIndex()
        return localPath
      }
    }

    const localPath = await this.downloadAndCacheAvatar(userId, avatarUrl, hash)
    return localPath
  }

  private async downloadAndCacheAvatar(
    userId: string,
    avatarUrl: string,
    hash: string
  ): Promise<string | null> {
    try {
      const fileName = `${hash}.jpg`
      const filePath = join(this.cacheDir, fileName)

      const success = await this.downloadAvatar(avatarUrl, filePath)
      if (success) {
        this.updateCacheIndex(userId, hash, filePath)
        return filePath
      }
      return null
    } catch (error) {
      log.error('Failed to download and cache avatar:', error)
      return null
    }
  }

  private updateCacheIndex(userId: string, hash: string, filePath: string): void {
    if (!this.cacheIndex[userId]) {
      this.cacheIndex[userId] = {
        userId,
        hash: '',
        localPaths: {},
        updatedAt: Date.now()
      }
    }

    this.cacheIndex[userId].hash = hash
    this.cacheIndex[userId].localPaths[hash] = filePath
    this.cacheIndex[userId].updatedAt = Date.now()
    this.saveIndex()
  }

  private generateHash(url: string): string {
    const pathParts = url.split('/')
    const filename = pathParts[pathParts.length - 1]
    const match = filename.match(/([a-f0-9]{8,})/)
    return match ? match[1] : createHash('md5').update(url).digest('hex').substring(0, 8)
  }

  private async downloadAvatar(url: string, filePath: string): Promise<boolean> {
    try {
      const arrayBuffer = await netMinIO.downloadAvatar(url)
      if (arrayBuffer) {
        writeFileSync(filePath, Buffer.from(arrayBuffer))
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

      if (existsSync(this.cacheDir)) {
        const fileList = readdirSync(this.cacheDir)
        for (const file of fileList) {
          if (file === 'index.json') continue
          const filePath = join(this.cacheDir, file)
          const stats = statSync(filePath)
          files.push({
            path: filePath,
            mtime: stats.mtime.getTime(),
            size: stats.size
          })
        }
      }

      files.sort((a, b) => a.mtime - b.mtime)

      let totalSize = files.reduce((sum, file) => sum + file.size, 0)
      const filesToDelete: string[] = []

      for (const file of files) {
        const age = now - file.mtime
        if (
          age > this.maxCacheAge ||
          totalSize > this.maxCacheSize ||
          files.length - filesToDelete.length > this.maxFiles
        ) {
          filesToDelete.push(file.path)
          totalSize -= file.size
        }
      }

      for (const filePath of filesToDelete) {
        try {
          unlinkSync(filePath)
          log.info('Deleted old cache file:', filePath)
        } catch (error) {
          log.error('Failed to delete cache file:', filePath, error)
        }
      }

      if (filesToDelete.length > 0) {
        this.cleanupIndex()
      }
    } catch (error) {
      log.error('Failed to cleanup old cache:', error)
    }
  }

  private cleanupIndex(): void {
    const validPaths = new Set<string>()
    try {
      if (existsSync(this.cacheDir)) {
        const fileList = readdirSync(this.cacheDir)
        for (const file of fileList) {
          if (file !== 'index.json') {
            validPaths.add(join(this.cacheDir, file))
          }
        }
      }
    } catch (error) {
      log.error('Failed to get valid paths:', error)
      return
    }

    for (const userId in this.cacheIndex) {
      const avatarInfo = this.cacheIndex[userId]
      const validLocalPaths: Record<string, string> = {}

      for (const hash in avatarInfo.localPaths) {
        const localPath = avatarInfo.localPaths[hash]
        if (validPaths.has(localPath)) {
          validLocalPaths[hash] = localPath
        }
      }

      if (Object.keys(validLocalPaths).length === 0) {
        delete this.cacheIndex[userId]
      } else {
        avatarInfo.localPaths = validLocalPaths
      }
    }

    this.saveIndex()
  }

  private startCleanupTimer(): void {
    setInterval(
      () => {
        this.cleanupOldCache()
      },
      60 * 60 * 1000
    )
  }

  clearCache(): void {
    try {
      if (existsSync(this.cacheDir)) {
        const files = readdirSync(this.cacheDir)
        for (const file of files) {
          const filePath = join(this.cacheDir, file)
          unlinkSync(filePath)
        }
      }
      this.cacheIndex = {}
      this.saveIndex()
      log.info('Avatar cache cleared')
    } catch (error) {
      log.error('Failed to clear cache:', error)
    }
  }

  getCacheStats(): { totalFiles: number; totalSize: number; cacheEntries: number } {
    let totalFiles = 0
    let totalSize = 0

    try {
      if (existsSync(this.cacheDir)) {
        const files = readdirSync(this.cacheDir)
        for (const file of files) {
          if (file !== 'index.json') {
            const filePath = join(this.cacheDir, file)
            const stats = statSync(filePath)
            totalFiles++
            totalSize += stats.size
          }
        }
      }
    } catch (error) {
      log.error('Failed to get cache stats:', error)
    }

    return {
      totalFiles,
      totalSize,
      cacheEntries: Object.keys(this.cacheIndex).length
    }
  }
}

const avatarCacheService = new AvatarCacheService()

export { avatarCacheService }
