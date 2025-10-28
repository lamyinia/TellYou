/* eslint-disable */
import { defineStore } from "pinia";
import { reactive, ref } from "vue";

/**
 * 统一的Profile Store
 * 管理用户和群组的头像、昵称信息
 *
 * 核心特性：
 * 1. 统一管理头像和昵称
 * 2. 支持用户(contactType=1)和群组(contactType=2)
 * 3. 事件驱动的UI更新
 * 4. 简化的渲染进程逻辑
 *
 * @author lanye
 * @since 2025/10/29
 */

interface ProfileCache {
  // 头像信息
  avatarPath?: string
  avatarVersion?: string
  avatarLoading: boolean
  avatarError?: string

  nickname?: string
  nickVersion?: string
  nickLoading: boolean
  nickError?: string

  lastUpdated: number
  contactType: number  // 1=用户, 2=群组
}

export const useProfileStore = defineStore("profile-unified", () => {
  // 缓存Map: key = `${targetId}_${contactType}`
  const profileCache = reactive<Map<string, ProfileCache>>(new Map())

  const loadingAvatars = reactive<Set<string>>(new Set())
  const loadingNicknames = reactive<Set<string>>(new Set())

  const maxCacheSize = ref(500)
  const cacheTimeout = ref(3 * 60 * 1000) // 3 分钟内存缓存

  /**
   * 生成缓存key
   */
  const getCacheKey = (targetId: string, contactType: number): string => {
    return `${targetId}_${contactType}`
  }

  /**
   * 获取或创建Profile缓存项
   */
  const getOrCreateProfile = (targetId: string, contactType: number): ProfileCache => {
    const key = getCacheKey(targetId, contactType)

    if (!profileCache.has(key)) {
      profileCache.set(key, {
        avatarLoading: false,
        nickLoading: false,
        lastUpdated: 0,
        contactType
      })
    }

    return profileCache.get(key)!
  }

  /**
   * 清理过期缓存
   */
  const cleanupCache = (): void => {
    if (profileCache.size <= maxCacheSize.value) return

    const now = Date.now()
    const entries = Array.from(profileCache.entries())

    const expiredKeys = entries
      .filter(([_, profile]) => now - profile.lastUpdated > cacheTimeout.value)
      .map(([key]) => key)

    expiredKeys.forEach(key => profileCache.delete(key))

    if (profileCache.size > maxCacheSize.value) {
      const sortedEntries = entries
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated)
        .slice(0, profileCache.size - maxCacheSize.value)

      sortedEntries.forEach(([key]) => profileCache.delete(key))
    }
  }

  /**
   * 获取头像路径
   */
  const getAvatarPath = async (targetId: string, strategy: string = 'thumbedAvatarUrl', contactType: number = 1, version?: string): Promise<string | null> => {
    if (!targetId) return null

    const profile = getOrCreateProfile(targetId, contactType)
    const loadingKey = `${targetId}_${contactType}_${strategy}`

    if (profile.avatarPath && !version) {
      profile.lastUpdated = Date.now()
      return profile.avatarPath
    }
    if (loadingAvatars.has(loadingKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!loadingAvatars.has(loadingKey)) {
            clearInterval(checkInterval)
            resolve(profile.avatarPath || null)
          }
        }, 100)
      })
    }

    try {
      loadingAvatars.add(loadingKey)
      profile.avatarLoading = true
      profile.avatarError = undefined

      const result = await window.electronAPI.invoke('profile:get-avatar-path', { targetId, strategy, contactType, version })
      if (result.success && result.localPath) {
        profile.avatarPath = result.localPath
        profile.avatarVersion = version
        profile.lastUpdated = Date.now()
        return result.localPath
      } else {
        return null
      }
    } catch (error) {
      profile.avatarError = error instanceof Error ? error.message : 'Unknown error'
      console.error('ProfileStore:getAvatarPath error:', error)
      return null
    } finally {
      profile.avatarLoading = false
      loadingAvatars.delete(loadingKey)
      cleanupCache()
    }
  }

  /**
   * 获取昵称
   */
  const getNickname = async (targetId: string, contactType: number = 1, placeholder: string = '未知'): Promise<string> => {
    if (!targetId) return placeholder

    const profile = getOrCreateProfile(targetId, contactType)
    const loadingKey = `${targetId}_${contactType}_nickname`

    // 检查内存缓存
    if (profile.nickname) {
      profile.lastUpdated = Date.now()
      return profile.nickname
    }

    // 防止重复请求
    if (loadingNicknames.has(loadingKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!loadingNicknames.has(loadingKey)) {
            clearInterval(checkInterval)
            resolve(profile.nickname || placeholder)
          }
        }, 100)
      })
    }

    try {
      loadingNicknames.add(loadingKey)
      profile.nickLoading = true
      profile.nickError = undefined

      // 调用主进程获取昵称
      const result = await window.electronAPI.invoke('profile:get-nickname', {
        targetId,
        contactType
      })

      if (result.nickname) {
        profile.nickname = result.nickname
        profile.nickVersion = result.version
        profile.lastUpdated = Date.now()
        return result.nickname
      }

      return placeholder
    } catch (error) {
      profile.nickError = error instanceof Error ? error.message : 'Unknown error'
      console.error('ProfileStore:getNickname error:', error)
      return placeholder
    } finally {
      profile.nickLoading = false
      loadingNicknames.delete(loadingKey)
      cleanupCache()
    }
  }

  /**
   * 触发Profile更新
   */
  const triggerUpdate = async (targetId: string, strategy: string = 'thumbedAvatarUrl', contactType: number = 1): Promise<void> => {
    try {
      await window.electronAPI.invoke('profile:trigger-update', {
        targetId,
        strategy,
        contactType
      })
    } catch (error) {
      console.error('ProfileStore:triggerUpdate error:', error)
    }
  }

  /**
   * 监听主进程的Profile更新事件
   */
  const setupEventListeners = (): void => {
    window.electronAPI.on('profile-updated', (event: Electron.IpcRendererEvent, params: any) => {
      const { targetId, contactType, strategy } = params
      const key = getCacheKey(targetId, contactType)

      if (profileCache.has(key)) {
        const profile = profileCache.get(key)!
        profile.nickname = undefined
        profile.nickVersion = undefined
        profile.avatarPath = undefined
        profile.avatarVersion = undefined
        profile.lastUpdated = 0
      }
      console.info(`ProfileStore: 收到更新事件 ${targetId}_${contactType}_${strategy}`)
    })
  }

  /**
   * 清除缓存
   */
  const clearCache = (targetId?: string, contactType?: number): void => {
    if (targetId && contactType !== undefined) {
      const key = getCacheKey(targetId, contactType)
      profileCache.delete(key)
    } else {
      profileCache.clear()
    }
  }

  /**
   * 获取缓存状态
   */
  const getCacheInfo = () => {
    return {
      size: profileCache.size,
      maxSize: maxCacheSize.value,
      timeout: cacheTimeout.value
    }
  }

  /**
   * 批量预加载
   */
  const preloadProfiles = async (targets: Array<{ targetId: string; contactType: number; strategy?: string }>): Promise<void> => {
    const promises = targets.map(({ targetId, contactType, strategy = 'thumbedAvatarUrl' }) => {
      return Promise.all([
        getAvatarPath(targetId, strategy, contactType),
        getNickname(targetId, contactType)
      ])
    })

    await Promise.allSettled(promises)
  }

  setupEventListeners()

  return {
    // 状态
    profileCache,
    loadingAvatars,
    loadingNicknames,

    // 核心方法
    getAvatarPath,
    getNickname,
    triggerUpdate,

    // 工具方法
    clearCache,
    getCacheInfo,
    preloadProfiles,

    // 内部方法（用于测试）
    getCacheKey,
    cleanupCache
  }
})

// 导出类型
export type { ProfileCache }
