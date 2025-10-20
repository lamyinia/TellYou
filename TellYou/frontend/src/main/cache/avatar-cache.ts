import { ipcMain } from 'electron'
import { join } from 'path'
import fs, { existsSync, writeFileSync, readFileSync, renameSync } from 'fs'
import { netMinIO } from '../util/net-util'
import log from 'electron-log'
import urlUtil from '@main/util/url-util'

interface ImageInfo {
  version: string
  localPath: string
}
// strategy 缩略图或者原图
interface CacheItem {
  [strategy: string]: ImageInfo
}

class AvatarCache {
  private cacheMap: Map<string, CacheItem> = new Map()
  private jsonLoadingMap: Map<string, Promise<Record<string, unknown>>> = new Map()
  private jsonMap: Map<string, Record<string, unknown>> = new Map()

  public beginServe(): void {
    ipcMain.handle('avatar:cache:seek-by-version',
      async (_, params: { userId: string; strategy: string; version: string }) => {
        // 查本地json，检验版本，版本不过关，查 static/json
        let item = this.cacheMap.get(params.userId)
        if (item && this.checkVersion(item, params.strategy, params.version) && existsSync(item[params.strategy].localPath)) {
          // 命中主进程缓存
          console.info('avatar:cache:seek-by-version 命中 主进程缓存')
          return { success: true, pathResult: urlUtil.signByApp(item[params.strategy].localPath) }
        } else if (existsSync(this.getJsonPath(params.userId))) {
          try {
            item = JSON.parse(fs.readFileSync(this.getJsonPath(params.userId), 'utf-8')) as CacheItem
            console.info('avatar:cache:seek-by-version:比较版本 ', item, params)
            if (item && this.checkVersion(item, params.strategy, params.version) && existsSync(item[params.strategy].localPath)) {
              // 查 json 命中缓存
              console.info('avatar:cache:seek-by-version 命中 json 文件')
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
        console.info('debug:downloadJson:下载元信息:  ', [urlUtil.atomPath, params.userId + '.json'].join('/'))
        const result = await this.getMetaJson(params.userId)
        return { success: false, pathResult: result[params.strategy] }
      }
    )
    ipcMain.handle('avatar:get-newer', async (_, { userId, strategy, avatarUrl }) => {
      try {
        const filePath = await this.setNewAvatar(userId, strategy, avatarUrl)
        if (!filePath) return null
        return urlUtil.signByApp(filePath)
      } catch (error) {
        console.error('Failed to get avatar:', error)
        return null
      }
    })
  }
  // 单飞防并发设计
  private async getMetaJson(userId: string): Promise<Record<string, unknown>> {
    const cached = this.jsonMap.get(userId)
    if (cached){
      console.info('avatar-cache:get-meta-json:命中jsonMap', cached)
      return cached
    }
    const inflight = this.jsonLoadingMap.get(userId)
    if (inflight){
      console.info('avatar-cache:get-meta-json:命中jsonLoadingMap', inflight)
      return inflight
    }

    const promise = netMinIO.downloadJson([urlUtil.atomPath, userId + '.json'].join('/'))
      .then((result: Record<string, unknown>) => {
        this.jsonMap.set(userId, result)
        this.jsonLoadingMap.delete(userId)
        setTimeout(() => this.jsonMap.delete(userId), 8000)
        return result
      })
      .catch((e) => {
        this.jsonLoadingMap.delete(userId)
        throw e
      })
    this.jsonLoadingMap.set(userId, promise)
    return promise
  }

  private async setNewAvatar(userId: string, strategy: string, avatarUrl: string): Promise<string | null> {
    try {
      const filePath = join(urlUtil.cachePaths['avatar'], userId, strategy, this.extractObjectFromUrl(avatarUrl))
      urlUtil.ensureDir(join(urlUtil.cachePaths['avatar'], userId, strategy))  // {userData}/cache/avatar/{userId}/{strategy}/{obj}
      console.info('avatar-cache:getAvatarPath:准备下载头像:  ', [userId, avatarUrl, filePath].join('-'))
      const success = await this.downloadAndSaveAvatar(avatarUrl, filePath)
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
  // 下载头像，并保存在本地磁盘
  private async downloadAndSaveAvatar(url: string, filePath: string): Promise<boolean> {
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
  //  更新本地版本号
  private updateCacheIndex(userId: string, strategy: string, version: string, filePath: string): void {
    let item = this.cacheMap.get(userId)
    if (!item) {
      const jsonPath = this.getJsonPath(userId)
      if (existsSync(jsonPath)) {
        try {
          item = JSON.parse(readFileSync(jsonPath, 'utf-8')) as CacheItem
        } catch {  //  文件可能被删除或者不存在
          item = {} as CacheItem
        }
      } else {
        item = {} as CacheItem
      }
    }
    item[strategy] = { version: version, localPath: filePath }
    this.cacheMap.set(userId, item)
    this.saveItem(userId, item)
  }

  private checkVersion(item: CacheItem, strategy: string, version: string): boolean {
    return item[strategy] && Number.parseInt(item[strategy].version) >= Number.parseInt(version)
  }

  private extractVersionFromUrl(url: string): string {
    return new URL(url).pathname.split('/').at(-2) || ''
  }

  private extractObjectFromUrl(url: string): string {
    return new URL(url).pathname.split('/').at(-1) || ''
  }

  private saveItem(userId: string, cacheItem: CacheItem): void {
    try {
      const jsonPath = this.getJsonPath(userId)
      const tmpPath = jsonPath + '.tmp'
      writeFileSync(tmpPath, JSON.stringify(cacheItem, null, 2))
      renameSync(tmpPath, jsonPath)
    } catch (error) {
      log.error('Failed to save cache index:', error)
    }
  }
  private getJsonPath = (userId: string): string => join(urlUtil.cachePaths['avatar'], userId, 'index.json') // {userData}/cache/avatar/{userId}/index.json
}

const avatarCache = new AvatarCache()

export { avatarCache }
