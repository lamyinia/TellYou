/* eslint-disable */
import { defineStore } from "pinia";
import { reactive } from "vue";

/**
 * 主要问题 （已解决-20251030-1:06）
 * 1) setInterval 有内存泄漏的风险
 * 2) 渲染进程多余的 ttl 策略和内存淘汰机制，应该把这些逻辑丢给主进程，而不是渲染进程
 * 3) getNickname 方法参数没有下发版本
 * 4) 监听的 'profile-updated' 意义不明
 * 5）需要保证每次每个 invoke 事件，只有一个请求去触发
 */

/**
 * 统一的Profile Store
 * 管理用户和群组的头像、昵称信息
 *
 * 核心特性：
 * 1. 缓存策略：主进程已有 8 秒内存缓存和 2 分钟数据库缓存，策略合理
 * 2. 并发控制：使用 inflight Map 避免重复请求
 * 3. 事件驱动：使用事件通知 UI 更新，降低耦合
 * 4. 版本控制：头像版本比对逻辑合理
 *
 * @author lanye
 * @since 2025/10/29
 */

export const useProfileStore = defineStore("profile-unified", () => {

  const avatarKey = (targetId: string, contactType: number, strategy: string) => `${targetId}_${contactType}_${strategy}`
  const avatarInflight = reactive<Map<string, Promise<any>>>(new Map())
  const avatarTrigger = reactive<Map<string, string>>(new Map())

  const nicknameKey = (targetId: string, contactType: number) => `${targetId}_${contactType}`
  const nicknameInflight = reactive<Map<string, Promise<any>>>(new Map())
  const nicknameTrigger = reactive<Map<string, string>>(new Map())


  const getAvatarPath = async (targetId: string, strategy: string = 'thumbedAvatarUrl', contactType: number = 1, version: string = '999999'): Promise<string | null> => {
    if (!targetId) return null

    const loadingKey = avatarKey(targetId, contactType, strategy)
    if (avatarInflight.has(loadingKey)) {
      const result = await avatarInflight.get(loadingKey)
      if (result.success && result.localPath) {
        return result.localPath
      }
    }

    try {
      const promise = window.electronAPI.invoke('profile:get-avatar-path', { targetId, strategy, contactType, version })
      avatarInflight.set(loadingKey, promise)
      const result = await promise
      avatarInflight.delete(loadingKey)
      if (result.success && result.localPath) {
        return result.localPath
      } else {
        return null
      }
    } catch (error) {
      console.error('ProfileStore:getAvatarPath error:', error)
      return null
    }
  }

  const getNickname = async (targetId: string, contactType: number = 1, version: string = '999999', placeholder: string = '未知'): Promise<string> => {
    if (!targetId) return placeholder

    const loadingKey = nicknameKey(targetId, contactType)
    if (nicknameInflight.has(loadingKey)) {
      const existingPromise = nicknameInflight.get(loadingKey)!
      try {
        const result = await existingPromise
        return result || placeholder
      } catch {
        return placeholder
      }
    }

    try {
      const promise = window.electronAPI.invoke('profile:get-nickname', { targetId, contactType, version })
      nicknameInflight.set(loadingKey, promise)
      const result = await promise
      nicknameInflight.delete(loadingKey)
      return result || placeholder
    } catch (error) {
      nicknameInflight.delete(loadingKey)
      console.error('ProfileStore:getNickname error:', error)
      return placeholder
    }
  }

  const triggerUpdate = async (targetId: string, strategy: string = 'thumbedAvatarUrl', contactType: number = 1): Promise<void> => {
    try {
      await window.electronAPI.invoke('profile:trigger-update', { targetId, strategy, contactType })
    } catch (error) {
      console.error('ProfileStore:triggerUpdate error:', error)
    }
  }

  interface ProfileUpdatedParams {
    targetId: string
    contactType: number
    strategy: string
    metaInfo: string
  }

  const profileUpdatedHandler = (...args: unknown[]): void => {
    const params = args[1] as ProfileUpdatedParams
    if (!params || typeof params !== 'object' || !('targetId' in params)) {
      console.warn('ProfileStore: 收到无效的更新事件参数', args)
      return
    }
    const { targetId, contactType, strategy, metaInfo } = params
    if (strategy === 'nickname') {
      nicknameTrigger.set(nicknameKey(targetId, contactType), metaInfo)
    } else {
      avatarTrigger.set(avatarKey(targetId, contactType, strategy), metaInfo)
    }
    console.info(`ProfileStore: 收到更新事件 ${targetId}_${contactType}_${strategy}: ${metaInfo}`)
  }

  const setupEventListeners = (): void => {
    window.electronAPI.on('profile-updated', profileUpdatedHandler)
  }

  const cleanupEventListeners = (): void => {
    window.electronAPI.removeListener('profile-updated', profileUpdatedHandler)
  }

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
    avatarKey,
    avatarTrigger,

    nicknameKey,
    nicknameTrigger,

    getAvatarPath,
    getNickname,
    triggerUpdate,
    preloadProfiles,
    cleanupEventListeners,
  }
})
