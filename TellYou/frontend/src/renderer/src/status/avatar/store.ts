import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'

interface AvatarCacheItem {
  userId: string
  avatarUrl: string
  hash: string
  localPath: string | null
  size: number
  loading: boolean
  error: string | null
  lastAccessed: number
}

interface AvatarStats {
  totalUsers: number
  totalFiles: number
  totalSize: number
}

export const useAvatarStore = defineStore('avatar', () => {
  // 内存缓存：userId+size -> AvatarCacheItem
  const memoryCache = reactive<Map<string, AvatarCacheItem>>(new Map())
  const stats = ref<AvatarStats>({ totalUsers: 0, totalFiles: 0, totalSize: 0 })
  const maxMemoryCache = 200


  const getCacheKey = (userId: string, size: number): string => {
    return `${userId}_${size}`
  }

  const extractHashFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)
      const version = urlObj.searchParams.get('v')
      if (version) return version

      const pathParts = urlObj.pathname.split('/')
      const filename = pathParts[pathParts.length - 1]
      const match = filename.match(/([a-f0-9]{8,})/)
      return match ? match[1] : ''
    } catch {
      return ''
    }
  }
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

  const getAvatar = async (userId: string, avatarUrl: string, size: number = 48): Promise<string | null> => {
    if (!userId || !avatarUrl) return null

    const cacheKey = getCacheKey(userId, size)
    const hash = extractHashFromUrl(avatarUrl)

    const cached = memoryCache.get(cacheKey)
    console.log('缓存哈希：', hash)
    if (cached && cached.hash === hash && cached.localPath) {
      console.log('缓存命中：', cached)
      cached.lastAccessed = Date.now()
      return cached.localPath
    }

    if (cached?.loading) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const current = memoryCache.get(cacheKey)
          if (current && !current.loading) {
            clearInterval(checkInterval)
            resolve(current.localPath)
          }
        }, 50)
      })
    }

    const cacheItem: AvatarCacheItem = {
      userId,
      avatarUrl,
      hash,
      localPath: null,
      size,
      loading: true,
      error: null,
      lastAccessed: Date.now()
    }
    memoryCache.set(cacheKey, cacheItem)

    try {
      const localPath = await window.electronAPI.getAvatar({ userId, avatarUrl, size })
      if (localPath) {
        cacheItem.localPath = localPath
        cacheItem.loading = false
        cacheItem.error = null
        return localPath
      } else {
        cacheItem.loading = false
        cacheItem.error = 'Download failed'
        return null
      }
    } catch (error) {
      cacheItem.loading = false
      cacheItem.error = error instanceof Error ? error.message : 'Unknown error'
      return null
    } finally {
      cleanupMemoryCache()
    }
  }

  // 批量预加载头像
  const preloadAvatars = async (avatarMap: Record<string, string>, size: number = 48): Promise<void> => {
    const promises = Object.entries(avatarMap).map(([userId, avatarUrl]) =>
      getAvatar(userId, avatarUrl, size)
    )
    await Promise.allSettled(promises)
  }

  // 清除用户头像缓存
  const clearUserCache = async (userId: string): Promise<void> => {
    // 清除内存缓存
    const keysToDelete: string[] = []
    for (const [key, item] of memoryCache.entries()) {
      if (item.userId === userId) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => memoryCache.delete(key))

    // 清除主进程缓存
    try {
      await window.electronAPI.clearAvatarCache(userId)
    } catch (error) {
      console.error('Failed to clear avatar cache:', error)
    }
  }

  // 获取缓存统计
  const updateStats = async (): Promise<void> => {
    try {
      stats.value = await window.electronAPI.getAvatarCacheStats()
    } catch (error) {
      console.error('Failed to get avatar cache stats:', error)
    }
  }

  // 获取内存缓存统计
  const getMemoryStats = () => {
    return {
      memoryCacheSize: memoryCache.size,
      loadingCount: Array.from(memoryCache.values()).filter(item => item.loading).length,
      errorCount: Array.from(memoryCache.values()).filter(item => item.error).length
    }
  }

  // 清理所有内存缓存
  const clearMemoryCache = (): void => {
    memoryCache.clear()
  }

  return {
    // State
    memoryCache,
    stats,

    // Actions
    getAvatar,
    preloadAvatars,
    clearUserCache,
    updateStats,
    getMemoryStats,
    clearMemoryCache
  }
})
