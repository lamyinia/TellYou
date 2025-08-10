import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ChatMessage, MessageCacheConfig, MessagePageInfo } from '@renderer/store/message/message-class'

export const useMessageStore = defineStore('message', () => {
  // 配置
  const config: MessageCacheConfig = {
    maxMessagesPerSession: 1000,
    maxCachedSessions: 5,
    pageSize: 50,
    preloadThreshold: 10,
    cacheExpireTime: 30 * 60 * 1000
  }

  // 状态：移除 currentSessionId，通过参数传递
  const messageCache = ref<Map<number, ChatMessage[]>>(new Map())
  const pageInfoCache = ref<Map<number, MessagePageInfo>>(new Map())
  const sessionAccessTime = ref<Map<number, number>>(new Map())
  const isLoading = ref(false)
  const isLoadingOlder = ref(false)
  const isLoadingNewer = ref(false)

  // 计算属性：需要传入 sessionId 参数
  const getCurrentSessionMessages = (sessionId: number): ChatMessage[] => {
    if (!sessionId) return []
    return messageCache.value.get(sessionId) || []
  }

  const getCurrentPageInfo = (sessionId: number): MessagePageInfo | null => {
    if (!sessionId) return null
    return pageInfoCache.value.get(sessionId) || null
  }

  // 获取指定会话的消息
  const getSessionMessages = (sessionId: number): ChatMessage[] => {
    return messageCache.value.get(sessionId) || []
  }

  // 获取指定会话的分页信息
  const getSessionPageInfo = (sessionId: number): MessagePageInfo | null => {
    return pageInfoCache.value.get(sessionId) || null
  }

  // 🎯 设置当前会话：不维护自己的currentSessionId
  const setCurrentSession = (sessionId: number): void => {
    // 更新访问时间
    sessionAccessTime.value.set(sessionId, Date.now())

    // 如果该会话没有消息，立即加载
    if (!messageCache.value.has(sessionId)) {
      loadInitialMessages(sessionId)
    }

    // 智能清理过期缓存
    cleanupExpiredCache()
  }

  // 智能缓存清理
  const cleanupExpiredCache = (): void => {
    const now = Date.now()
    const sessions = Array.from(sessionAccessTime.value.entries())

    sessions.sort(([, timeA], [, timeB]) => timeA - timeB)

    while (sessions.length > config.maxCachedSessions) {
      const [sessionId] = sessions.shift()!

      messageCache.value.delete(sessionId)
      pageInfoCache.value.delete(sessionId)
      sessionAccessTime.value.delete(sessionId)

      console.log(`清理过期缓存: 会话 ${sessionId}`)
    }

    sessions.forEach(([sessionId, lastAccessTime]) => {
      if (now - lastAccessTime > config.cacheExpireTime) {
        messageCache.value.delete(sessionId)
        pageInfoCache.value.delete(sessionId)
        sessionAccessTime.value.delete(sessionId)
        console.log(`清理过期缓存: 会话 ${sessionId}`)
      }
    })
  }

  // 加载初始消息（最新消息）
  const loadInitialMessages = async (sessionId: number): Promise<void> => {
    if (isLoading.value) return

    isLoading.value = true
    try {
      const result = await window.electronAPI.getSessionMessages(sessionId, {
        limit: config.pageSize,
        direction: 'newest'
      })

      messageCache.value.set(sessionId, result.messages)

      pageInfoCache.value.set(sessionId, {
        sessionId,
        hasMore: result.hasMore,
        hasMoreNewer: false,
        oldestMessageId: result.messages[result.messages.length - 1]?.id || null,
        newestMessageId: result.messages[0]?.id || null,
        totalCount: result.totalCount
      })

    } catch (error) {
      console.error('加载初始消息失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 加载更早的消息（向上滚动）
  const loadOlderMessages = async (sessionId: number): Promise<boolean> => {
    if (isLoadingOlder.value) return false

    const pageInfo = pageInfoCache.value.get(sessionId)
    if (!pageInfo?.hasMore) return false

    isLoadingOlder.value = true
    try {
      const result = await window.electronAPI.getSessionMessages(sessionId, {
        limit: config.pageSize,
        beforeId: pageInfo.oldestMessageId,
        direction: 'older'
      })

      if (result.messages.length > 0) {
        const currentMessages = messageCache.value.get(sessionId) || []
        const newMessages = [...currentMessages, ...result.messages]

        if (newMessages.length > config.maxMessagesPerSession) {
          newMessages.splice(0, newMessages.length - config.maxMessagesPerSession)
        }

        messageCache.value.set(sessionId, newMessages)

        pageInfoCache.value.set(sessionId, {
          ...pageInfo,
          hasMore: result.hasMore,
          oldestMessageId: newMessages[newMessages.length - 1]?.id || null
        })

        return true
      }

      return false
    } catch (error) {
      console.error('加载更早消息失败:', error)
      return false
    } finally {
      isLoadingOlder.value = false
    }
  }

  // 加载更新的消息（向下滚动或新消息）
  const loadNewerMessages = async (sessionId: number): Promise<boolean> => {
    if (isLoadingNewer.value) return false

    const pageInfo = pageInfoCache.value.get(sessionId)
    if (!pageInfo?.hasMoreNewer) return false

    isLoadingNewer.value = true
    try {
      const result = await window.electronAPI.getSessionMessages(sessionId, {
        limit: config.pageSize,
        afterId: pageInfo.newestMessageId,
        direction: 'newer'
      })

      if (result.messages.length > 0) {
        const currentMessages = messageCache.value.get(sessionId) || []
        const newMessages = [...result.messages, ...currentMessages]

        if (newMessages.length > config.maxMessagesPerSession) {
          newMessages.splice(config.maxMessagesPerSession)
        }

        messageCache.value.set(sessionId, newMessages)

        pageInfoCache.value.set(sessionId, {
          ...pageInfo,
          hasMoreNewer: result.hasMore,
          newestMessageId: newMessages[0]?.id || null
        })

        return true
      }

      return false
    } catch (error) {
      console.error('加载更新消息失败:', error)
      return false
    } finally {
      isLoadingNewer.value = false
    }
  }

  // 添加新消息
  const addMessage = (sessionId: number, message: ChatMessage): void => {
    const currentMessages = messageCache.value.get(sessionId) || []
    const newMessages = [message, ...currentMessages]

    if (newMessages.length > config.maxMessagesPerSession) {
      newMessages.splice(config.maxMessagesPerSession)
    }

    messageCache.value.set(sessionId, newMessages)

    const pageInfo = pageInfoCache.value.get(sessionId)
    if (pageInfo) {
      pageInfoCache.value.set(sessionId, {
        ...pageInfo,
        newestMessageId: message.id,
        totalCount: pageInfo.totalCount + 1
      })
    }
  }

  // 预加载检查（滚动时调用）
  const checkPreload = (sessionId: number, scrollTop: number, scrollHeight: number, clientHeight: number): void => {
    const pageInfo = pageInfoCache.value.get(sessionId)
    if (!pageInfo) return

    if (pageInfo.hasMore && scrollTop < config.preloadThreshold) {
      loadOlderMessages(sessionId)
    }

    if (pageInfo.hasMoreNewer && (scrollHeight - scrollTop - clientHeight) < config.preloadThreshold) {
      loadNewerMessages(sessionId)
    }
  }

  // 手动清理指定会话缓存
  const clearSessionCache = (sessionId: number): void => {
    messageCache.value.delete(sessionId)
    pageInfoCache.value.delete(sessionId)
    sessionAccessTime.value.delete(sessionId)
    console.log(`手动清理缓存: 会话 ${sessionId}`)
  }

  // 清理所有缓存
  const clearAllCache = (): void => {
    messageCache.value.clear()
    pageInfoCache.value.clear()
    sessionAccessTime.value.clear()
    console.log('清理所有缓存')
  }

  // 获取缓存统计信息
  const getCacheStats = (): {
    cachedSessions: number
    totalMessages: number
    sessionAccessTimes: Record<string, number>
  } => {
    return {
      cachedSessions: messageCache.value.size,
      totalMessages: Array.from(messageCache.value.values()).reduce((sum, messages) => sum + messages.length, 0),
      sessionAccessTimes: Object.fromEntries(sessionAccessTime.value)
    }
  }

  return {
    // 状态
    isLoading,
    isLoadingOlder,
    isLoadingNewer,

    // 计算属性（需要传入sessionId）
    getCurrentSessionMessages,
    getCurrentPageInfo,

    // 方法
    getSessionMessages,
    getSessionPageInfo,
    setCurrentSession,
    loadInitialMessages,
    loadOlderMessages,
    loadNewerMessages,
    addMessage,
    checkPreload,
    clearSessionCache,
    clearAllCache,
    getCacheStats
  }
})
