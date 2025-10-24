import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import {
  ChatMessage,
  MessageCacheConfig,
  MessagePageInfo,
  MessagesResponse
} from '@renderer/status/message/class'

export const useMessageStore = defineStore('message', () => {
  const config: MessageCacheConfig = {
    maxMessagesPerSession: 50,
    maxCachedSessions: 1,
    pageSize: 20,
    preloadThreshold: 10,
    cacheExpireTime: 30 * 60 * 1000
  }

  const messageCache = reactive<Record<string, ChatMessage[]>>({})
  const pageInfoCache = reactive<Record<string, MessagePageInfo>>({})
  const sessionAccessTime = reactive<Record<string, number>>({})
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const isLoadingOlder = ref(false)
  const isLoadingNewer = ref(false)
  let loadMessageFunction: ((...args: unknown[]) => void) | null = null

  const init = (): void => {
    console.log('messageStore 开始初始化')
    if (isInitialized.value === true || loadMessageFunction) return
    loadMessageFunction = (...args: unknown[]): void => {
      const [, messages] = args as [Electron.IpcRendererEvent, ChatMessage[]]
      messages.forEach((message) => {
        console.log(message)
        addMessage(message.sessionId, message)
      })
    }
    window.electronAPI.on('message:call-back:load-data', loadMessageFunction)
    isInitialized.value = true
    console.log('messageStore 初始化完成')
  }
  const destroy = (): void => {
    clearAllCache()
    isInitialized.value = false
    window.electronAPI.removeListener('message:call-back:load-data', loadMessageFunction!)
  }
  const getCurrentSessionMessages = (sessionId: string | number): ChatMessage[] => {
    const key = String(sessionId)
    if (!key) return []
    const result = messageCache[key] || []
    console.log(`getCurrentSessionMessages(${sessionId}):`, result.length, 'messages')
    return result
  }
  const getCurrentPageInfo = (sessionId: string | number): MessagePageInfo | null => {
    const key = String(sessionId)
    if (!key) return null
    return pageInfoCache[key] || null
  }
  const getSessionMessages = (sessionId: string | number): ChatMessage[] => {
    const key = String(sessionId)
    return messageCache[key] || []
  }
  const getSessionPageInfo = (sessionId: string | number): MessagePageInfo | null => {
    const key = String(sessionId)
    return pageInfoCache[key] || null
  }
  const setCurrentSession = async (sessionId: string | number): void => {
    const key = String(sessionId)
    sessionAccessTime[key] = Date.now()
    if (!messageCache[key]) {
      await loadMessagesById(key)
    }
    cleanupExpiredCache()
  }
  const cleanupExpiredCache = (): void => {
    const now = Date.now()
    const sessions = Object.entries(sessionAccessTime)
    sessions.sort(([, timeA], [, timeB]) => timeA - timeB)
    while (sessions.length > config.maxCachedSessions) {
      const [sessionId] = sessions.shift()!

      delete messageCache[String(sessionId)]
      delete pageInfoCache[String(sessionId)]
      delete sessionAccessTime[String(sessionId)]
      console.log(`清理过期缓存: 会话 ${sessionId}`)
    }
    sessions.forEach(([sessionId, lastAccessTime]) => {
      if (now - lastAccessTime > config.cacheExpireTime) {
        delete messageCache[String(sessionId)]
        delete pageInfoCache[String(sessionId)]
        delete sessionAccessTime[String(sessionId)]
        console.log(`清理过期缓存: 会话 ${sessionId}`)
      }
    })
  }
  const loadMessagesById = async (sessionId: string): Promise<void> => {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const result = (await window.electronAPI.requestMessages(sessionId, {
        limit: config.pageSize,
        direction: 'newest'
      })) as unknown as MessagesResponse
      console.log('查询当前会话信息', result)
      messageCache[String(sessionId)] = result.messages
      pageInfoCache[String(sessionId)] = {
        sessionId: String(sessionId),
        hasMore: result.hasMore,
        hasMoreNewer: false,
        oldestMessageId: result.messages[result.messages.length - 1]?.id || null,
        newestMessageId: result.messages[0]?.id || null,
        totalCount: result.totalCount
      }
    } catch (error) {
      console.error('加载初始消息失败:', error)
    } finally {
      isLoading.value = false
    }
  }
  const loadOlderMessages = async (sessionId: string): Promise<boolean> => {
    if (isLoadingOlder.value) return false
    const pageInfo = pageInfoCache[String(sessionId)]
    // if (!pageInfo?.hasMore) return false

    console.log('messageStore:缓存消息', pageInfo)

    isLoadingOlder.value = true
    try {
      const result = (await window.electronAPI.requestMessages(sessionId,
        { limit: config.pageSize, beforeId: pageInfo.oldestMessageId, direction: 'older' })) as unknown as MessagesResponse
      console.log('messageStore:查到消息: ', result)
      if (result.messages.length > 0) {
        const currentMessages = messageCache[String(sessionId)] || []
        const newMessages = [...currentMessages, ...result.messages]
        if (newMessages.length > config.maxMessagesPerSession) {
          newMessages.splice(0, newMessages.length - config.maxMessagesPerSession)
        }
        messageCache[String(sessionId)] = newMessages
        pageInfoCache[String(sessionId)] = {
          ...pageInfo,
          hasMore: result.hasMore,
          oldestMessageId: newMessages[newMessages.length - 1]?.id || null,
          newestMessageId: newMessages[0]?.id || null
        }
        return true
      } else {
        pageInfoCache[String(sessionId)].hasMore = false
      }
      return false
    } catch (error) {
      console.error('加载更早消息失败:', error)
      return false
    } finally {
      isLoadingOlder.value = false
    }
  }
  const loadNewerMessages = async (sessionId: string): Promise<boolean> => {
    if (isLoadingNewer.value) return false
    const pageInfo = pageInfoCache[String(sessionId)]
    // if (!pageInfo?.hasMoreNewer) return false
    isLoadingNewer.value = true
    try {
      const result = (await window.electronAPI.requestMessages(sessionId, {
        limit: config.pageSize,
        afterId: pageInfo.newestMessageId,
        direction: 'newer'
      })) as unknown as MessagesResponse
      if (result.messages.length > 0) {
        const currentMessages = messageCache[String(sessionId)] || []
        const newMessages = [...result.messages.reverse(), ...currentMessages]
        if (newMessages.length > config.maxMessagesPerSession) {
          newMessages.splice(config.maxMessagesPerSession)
        }
        messageCache[String(sessionId)] = newMessages
        pageInfoCache[String(sessionId)] = {
          ...pageInfo,
          hasMoreNewer: result.hasMore,
          oldestMessageId: newMessages[newMessages.length - 1]?.id || null,
          newestMessageId: newMessages[0]?.id || null
        }
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

  const addMessage = (sessionId: string | number, message: ChatMessage): void => {
    const key = String(sessionId)
    if (messageCache[key] === null) return
    const currentMessages = messageCache[key]
    const newMessages = [message, ...currentMessages]
    if (newMessages.length > config.maxMessagesPerSession) {
      newMessages.splice(config.maxMessagesPerSession)
    }
    messageCache[key] = newMessages
    const pageInfo = pageInfoCache[key]
    if (pageInfo) {
      pageInfoCache[key] = {
        ...pageInfo,
        oldestMessageId: newMessages[newMessages.length - 1]?.id || null,
        newestMessageId: newMessages[0]?.id || null,
        totalCount: pageInfo.totalCount + 1
      }
    }
    console.log(`消息已添加到缓存: sessionId=${sessionId}, messageId=${message.id}, 当前消息数=${newMessages.length}`)
  }

  const checkPreload = async (sessionId: string | number, scrollTop: number, scrollHeight: number, clientHeight: number): void => {
    const pageInfo = pageInfoCache[String(sessionId)]
    if (!pageInfo) return
    if (pageInfo.hasMore && scrollTop < config.preloadThreshold) {
      await loadOlderMessages(String(sessionId))
    }
    if (pageInfo.hasMoreNewer && scrollHeight - scrollTop - clientHeight < config.preloadThreshold) {
      await loadNewerMessages(String(sessionId))
    }
  }

  const clearSessionCache = (sessionId: string | number): void => {
    const key = String(sessionId)
    delete messageCache[key]
    delete pageInfoCache[key]
    delete sessionAccessTime[key]
    console.log(`手动清理缓存: 会话 ${sessionId}`)
  }

  const clearAllCache = (): void => {
    Object.keys(messageCache).forEach((key) => delete messageCache[key])
    Object.keys(pageInfoCache).forEach((key) => delete pageInfoCache[key])
    Object.keys(sessionAccessTime).forEach((key) => delete sessionAccessTime[key])
    console.log('清理所有缓存')
  }

  return {
    isLoading,
    isLoadingOlder,
    isLoadingNewer,
    init,
    destroy,
    getCurrentSessionMessages,
    getCurrentPageInfo,
    getSessionMessages,
    getSessionPageInfo,
    setCurrentSession,
    loadMessagesById,
    loadOlderMessages,
    loadNewerMessages,
    addMessage,
    checkPreload,
    clearSessionCache,
    clearAllCache
  }
})
