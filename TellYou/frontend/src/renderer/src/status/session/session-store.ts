import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SessionManager, Session } from '@renderer/status/session/session-class'

/**
 * 聚合会话和联系的状态管理工具类，方法有添加会话、删除会话、确定置顶、取消置顶、从sqlite加载数据、标记会话已
 * 读、更新最后消息、设置静音、取消静音、搜索会话
 */

export const useSessionStore = defineStore('session', () => {
  const sessionManager = ref(new SessionManager())
  const isInitialized = ref(false)
  const currentSessionId = ref<string>('')
  let loadSessionFunction: ((...args: unknown[]) => void) | null = null

  const sortedSessions = computed(() => sessionManager.value.getOrderedSessions())

  const init = ():void => {
    console.log('sessionStore 开始初始化')
    if (isInitialized.value === true || loadSessionFunction) return

    loadSessionFunction = (...args: unknown[]) => {
      const [, sessions] = args as [Electron.IpcRendererEvent, Session[]]
      console.log('收到会话数据:', sessions.length, '条')
      sessions.forEach((session) => {
        sessionManager.value.addSession(session)
      })
      console.log('会话数据已加载:', sessions.length, '条')
      console.log(sortedSessions.value)
    }

    window.electronAPI.on('loadSessionDataCallback', loadSessionFunction)
    window.electronAPI.send('loadSessionData')

    isInitialized.value = true
    console.log('sessionStore 初始化完成')
  }

  const destroy = (): void => {
    sessionManager.value.clear()
    isInitialized.value = false
    window.electronAPI.removeListener('loadSessionDataCallback', loadSessionFunction!)
  }


  const getSession = (sessionId: string | number): Session | undefined => {
    return sessionManager.value.getSession(String(sessionId))
  }
  const updateSession = (sessionId: string | number, updates: Partial<Session>): void => {
    sessionManager.value.updateSession(String(sessionId), updates)
  }
  const togglePin = (sessionId: string | number): void => {
    sessionManager.value.togglePin(String(sessionId))
  }
  const toggleMute = (sessionId: string | number): void => {
    sessionManager.value.toggleMute(String(sessionId))
  }
  const markAsRead = (sessionId: string | number): void => {
    sessionManager.value.markSessionAsRead(String(sessionId))
  }
  const searchSessions = (keyword: string): Session[] => {
    return sessionManager.value.searchSessions(keyword)
  }

  const setCurrentSessionId = (sessionId: string | number): void => {
    currentSessionId.value = String(sessionId)
  }

  return {
    sessionManager,
    sortedSessions,
    isInitialized,
    currentSessionId,
    init,
    destroy,
    getSession,
    updateSession,
    togglePin,
    toggleMute,
    markAsRead,
    searchSessions,
    setCurrentSessionId
  }
})
