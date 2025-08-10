import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SessionManager, Session } from '@renderer/store/session/session-class'

export const useSessionStore = defineStore('session', () => {
  // 状态
  const sessionManager = ref(new SessionManager())
  const isLoading = ref(false)
  const currentSessionId = ref<number | null>(null)

  // 计算属性
  const sessions = computed(() => sessionManager.value.getOrderedSessions())
  const pinnedSessions = computed(() => sessionManager.value.getPinnedSessions())
  const unpinnedSessions = computed(() => sessionManager.value.getUnpinnedSessions())
  const sessionCount = computed(() => sessionManager.value.getSessionCount())
  const totalUnreadCount = computed(() => sessionManager.value.getTotalUnreadCount())
  const currentSession = computed(() =>
    currentSessionId.value ? sessionManager.value.getSession(currentSessionId.value) : null
  )

  // 方法
  const addSession = async(session: Session): Promise<void> => {
    sessionManager.value.addSession(session)
    await window.electronAPI.addSession(session)
  }

  const loadSessionsFromDB = async (): Promise<void> => {
    if (isLoading.value) return

    isLoading.value = true
    try {
      if (sessionManager.value.getSessionCount() === 0 || sessionManager.value.isCacheExpired()) {
        const result = await window.electronAPI.getSessionsWithOrder()
        sessionManager.value.clear()
        sessionManager.value.addSessions(result)
      }
    } catch (error) {
      console.error('加载会话失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  const updateSessionLastMessage = async (sessionId: number, content: string): Promise<void> => {
    sessionManager.value.updateSession(sessionId, {
      lastMsgContent: content,
      lastMsgTime: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    try {
      await window.electronAPI.updateSessionLastMessage(sessionId, content, new Date())
    } catch (error) {
      console.error('更新数据库失败:', error)
    }
  }

  const togglePin = async (sessionId: number): Promise<void> => {
    sessionManager.value.togglePin(sessionId)

    try {
      await window.electronAPI.toggleSessionPin(sessionId)
    } catch (error) {
      console.error('更新置顶状态失败:', error)
    }
  }

  const toggleMute = async (sessionId: number): Promise<void> => {
    sessionManager.value.toggleMute(sessionId)
  }

  const markAsRead = (sessionId: number): void => {
    sessionManager.value.markSessionAsRead(sessionId)
  }

  const searchSessions = (keyword: string): Session[] => {
    return sessionManager.value.searchSessions(keyword) as Session[]
  }

  const setCurrentSession = async (sessionId: number | null): Promise<void> => {
    currentSessionId.value = sessionId

    if (sessionId) {
      console.log(`切换到会话: ${sessionId}`)

      try {
        // 动态导入避免循环依赖
        const { useMessageStore } = await import('@renderer/store/message/message-store')
        const messageStore = useMessageStore()
        messageStore.setCurrentSession(sessionId)
      } catch (error) {
        console.error('通知message-store失败:', error)
      }

      try {
        const session = sessionManager.value.getSession(sessionId)
        if (session) {
          sessionManager.value.updateSession(sessionId, {
            lastActive: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('更新会话访问时间失败:', error)
      }

      try {
        markAsRead(sessionId)
      } catch (error) {
        console.error('标记会话已读失败:', error)
      }

      try {
        const session = sessionManager.value.getSession(sessionId)
        if (session && session.unreadCount > 0) {
          sessionManager.value.reorderSessions()
        }
      } catch (error) {
        console.error('重新排序会话失败:', error)
      }

    } else {
      try {
        const { useMessageStore } = await import('@renderer/store/message/message-store')
        const messageStore = useMessageStore()

        messageStore.clearCurrentSession()
      } catch (error) {
        console.error('清空message-store状态失败:', error)
      }
    }
  }

  const refreshCache = (): Promise<void> => {
    sessionManager.value.clear()
    return loadSessionsFromDB()
  }

  return {
    // 状态
    sessionManager,
    isLoading,
    currentSessionId,  // 🎯 暴露给其他store使用

    // 计算属性
    sessions,
    pinnedSessions,
    unpinnedSessions,
    sessionCount,
    totalUnreadCount,
    currentSession,

    // 方法
    addSession,
    loadSessionsFromDB,
    updateSessionLastMessage,
    togglePin,
    toggleMute,
    markAsRead,
    searchSessions,
    setCurrentSession,  // 🎯 核心方法
    refreshCache
  }
})
