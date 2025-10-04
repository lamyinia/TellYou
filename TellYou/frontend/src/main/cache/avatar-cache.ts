import { app, ipcMain } from 'electron'
import { join } from 'path'
import fs, {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { netMinIO } from '../util/net-util'
import log from 'electron-log'
import urlUtil from '@main/util/url-util'

interface ImageInfo {
  version: string
  localPath: string
}
interface CacheItem {
  [strategy: string]: ImageInfo
}

class AvatarCacheService {
  private cacheMap: Map<string, CacheItem> = new Map()
  private readonly maxCacheSize: number = 100 * 1024 * 1024 // 100MB
  private readonly maxCacheAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  private readonly maxFiles: number = 1000
  private getJsonPath = (userId: string): string =>
    join(urlUtil.cachePaths['avatar'], userId, 'index.json') // {userData}/cache/avatar/{userId}/index.json

  public beginServe(): void {
    this.startCleanupTimer()

    ipcMain.handle(
      'avatar:cache:seek-by-version',
      async (_, params: { userId: string; strategy: string; version: string }) => {
        // 查本地json，检验版本，版本不过关，查 static/json
        let item = this.cacheMap.get(params.userId)
        if (
          item &&
          this.checkVersion(item, params.strategy, params.version) &&
          existsSync(item[params.strategy].localPath)
        ) {
          // 命中主进程缓存
          return { success: true, pathResult: urlUtil.signByApp(item[params.strategy].localPath) }
        } else if (existsSync(this.getJsonPath(params.userId))) {
          try {
            item = JSON.parse(
              fs.readFileSync(this.getJsonPath(params.userId), 'utf-8')
            ) as CacheItem
            console.info('avatar:cache:seek-by-version: ', item)
            if (
              item &&
              this.checkVersion(item, params.strategy, params.version) &&
              existsSync(item[params.strategy].localPath)
            ) {
              // 查 json 命中缓存
              this.cacheMap.set(params.userId, item)
              return {
                success: true,
                pathResult: urlUtil.signByApp(item[params.strategy].localPath)
              }
            }
          } catch (error) {
            console.error(error)
          }
        }
        console.info('debug:downloadJson:  ', [urlUtil.atomPath, params.userId + '.json'].join('/'))
        const result = (await netMinIO.downloadJson(
          [urlUtil.atomPath, params.userId + '.json'].join('/')
        )) as Record<string, unknown>
        return { success: false, pathResult: result[params.strategy] }
      }
    )

    ipcMain.handle('avatar:get', async (_, { userId, strategy, avatarUrl }) => {
      try {
        const filePath = await this.getAvatarPath(userId, strategy, avatarUrl)
        if (!filePath) return null
        return urlUtil.signByApp(filePath)
      } catch (error) {
        console.error('Failed to get avatar:', error)
        return null
      }
    })
  }
  private checkVersion(item: CacheItem, strategy: string, version: string): boolean {
    return item[strategy] && item[strategy].version >= version
  }
  private extractVersionFromUrl(url: string): string {
    return new URL(url).pathname.split('/').at(-2) || ''
  }
  private extractObjectFromUrl(url: string): string {
    return new URL(url).pathname.split('/').at(-1) || ''
  }
  private saveItem(userId: string, cacheItem: CacheItem): void {
    try {
      writeFileSync(this.getJsonPath(userId), JSON.stringify(cacheItem, null, 2))
    } catch (error) {
      log.error('Failed to save cache index:', error)
    }
  }

  async getAvatarPath(userId: string, strategy: string, avatarUrl: string): Promise<string | null> {
    try {
      // // {userData}/cache/avatar/{userId}/{strategy}/{obj}
      const filePath = join(
        urlUtil.cachePaths['avatar'],
        userId,
        strategy,
        this.extractObjectFromUrl(avatarUrl)
      )
      urlUtil.ensureDir(join(urlUtil.cachePaths['avatar'], userId, strategy))

      console.info('debug:downloadAvatar:  ', [userId, avatarUrl, filePath].join(' !!! '))

      const success = await this.downloadAvatar(avatarUrl, filePath)
      if (success) {
        this.updateCacheIndex(userId, strategy, this.extractVersionFromUrl(avatarUrl), filePath)
        return filePath
      }
      return null
    } catch (error) {
      log.error('Failed to download and cache avatar:', error)
      return null
    }
  }
  private async downloadAvatar(url: string, filePath: string): Promise<boolean> {
    try {
      const arrayBuffer = await netMinIO.downloadAvatar(url)
      if (arrayBuffer) {
        console.info('下载成功', url)
        writeFileSync(filePath, Buffer.from(arrayBuffer))
        return true
      }
      return false
    } catch (error) {
      log.error('Failed to download avatar:', url, error)
      return false
    }
  }
  private updateCacheIndex(
    userId: string,
    strategy: string,
    version: string,
    filePath: string
  ): void {
    let item = this.cacheMap.get(userId)
    if (item) {
      item[strategy] = { version: version, localPath: filePath }
    } else {
      item = {
        [strategy]: { version: version, localPath: filePath }
      } as CacheItem
    }
    this.cacheMap.set(userId, item)
    this.saveItem(userId, item)
  }

  private cleanupOldCache(): void {}
  private startCleanupTimer(): void {
    setInterval(
      () => {
        this.cleanupOldCache()
      },
      60 * 60 * 1000
    )
  }
}

const avatarCacheService = new AvatarCacheService()

export { avatarCacheService }
