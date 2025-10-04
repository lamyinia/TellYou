import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

interface AvatarCacheItem {
  version: string
  localPath: string | null
  loading: boolean
  error: string | null
  lastAccessed: number
}

interface AvatarStats {
  totalUsers: number
  totalFiles: number
  totalSize: number
}

/**
 * lanye
 * 2025/09/28 17:27
 * 约定优于配置
 */

export const useAvatarStore = defineStore('avatar', () => {
  const memoryCache = reactive<Map<string, AvatarCacheItem>>(new Map())
  const stats = ref<AvatarStats>({ totalUsers: 0, totalFiles: 0, totalSize: 0 })
  const maxMemoryCache = 200

  const getCacheKey = (userId: string, strategy: string): string => userId + '_' + strategy
  // 例子 http://113.44.158.255:32788/lanye/avatar/original/1948031012053333361/6/index.png?hash=3，这里返回 6
  const extractVersionFromUrl = (url: string): string =>
    new URL(url).pathname.split('/').at(-2) || '0'

  const cleanupMemoryCache = (): void => {
    if (memoryCache.size <= maxMemoryCache) return
    const items = Array.from(memoryCache.entries())
      .map(([key, item]) => ({ key, item, lastAccessed: item.lastAccessed }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
    const toDelete = items.slice(0, items.length - maxMemoryCache)
    toDelete.forEach(({ key }) => {
      memoryCache.delete(key)
    })
  }

  const seekCache = async (
    userId: string,
    strategy: string,
    version: string
  ): Promise<{ needUpdated: boolean; pathResult: string }> => {
    const item = memoryCache.get(getCacheKey(userId, strategy))

    console.info('debug:seekCache:   ', [userId, strategy, version].join('---'))

    if (item && item.localPath && item.version >= version) {
      // 渲染进程缓存命中
      console.info('debug:seekCache:渲染进程缓存命中   ', [userId, strategy, version].join('---'))
      return { needUpdated: false, pathResult: item.localPath }
    }
    const resp = await window.electronAPI.invoke('avatar:cache:seek-by-version', {
      userId,
      strategy,
      version
    })
    if (resp.success) {
      // 主进程缓存命中
      console.info('debug:seekCache:主进程缓存命中   ', resp)
      memoryCache.set(getCacheKey(userId, strategy), {
        version: version,
        localPath: resp.pathResult,
        loading: false,
        error: null,
        lastAccessed: Date.now()
      } as AvatarCacheItem)
    }
    return { needUpdated: !resp.success, pathResult: resp.pathResult }
  }
  const getAvatar = async (
    userId: string,
    strategy: string,
    avatarUrl: string
  ): Promise<string | null> => {
    if (!userId || !avatarUrl) return null

    const key: string = getCacheKey(userId, strategy)
    const version = extractVersionFromUrl(avatarUrl)
    const cached = memoryCache.get(key)

    if (cached && cached.localPath && cached.version >= version) {
      console.info('debug:getAvatar:渲染进程缓存命中   ', [userId, strategy, version].join('---'))
      cached.lastAccessed = Date.now()
      return cached.localPath
    }
    if (cached?.loading) {
      console.info('debug:getAvatar:正在加载，等待其它任务完成')
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const current = memoryCache.get(key)
          if (current && !current.loading) {
            clearInterval(checkInterval)
            resolve(current.localPath)
          }
        }, 50)
      })
    }

    const cacheItem: AvatarCacheItem = {
      version: version,
      localPath: null,
      loading: true,
      error: null,
      lastAccessed: Date.now()
    }
    memoryCache.set(key, cacheItem)

    try {
      const localPath = await window.electronAPI.getAvatar({ userId, strategy, avatarUrl })
      if (localPath) {
        cacheItem.localPath = localPath
        cacheItem.error = null
        return localPath
      } else {
        cacheItem.error = 'Download failed'
        return null
      }
    } catch (error) {
      cacheItem.error = error instanceof Error ? error.message : 'Unknown error'
      return null
    } finally {
      cacheItem.loading = false
      cleanupMemoryCache()
    }
  }
  const clearMemoryCache = (): void => {
    memoryCache.clear()
  }
  return {
    extractVersionFromUrl,
    memoryCache,
    stats,
    seekCache,
    getAvatar,
    clearMemoryCache
  }
})
