import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SessionManager, Session } from '@renderer/store/session/session-class'

/**
 * 聚合会话和联系的状态管理工具类，方法有添加会话、删除会话、确定置顶、取消置顶、从sqlite加载数据、标记会话已
 * 读、更新最后消息、设置静音、取消静音、搜索会话
 */

export const useSessionStore = defineStore('session', () => {
  const sessionManager = ref(new SessionManager())
  const isInitialized = ref(false)
  let loadSessionFunction: ((_: Electron.IpcRendererEvent, sessions: Session[]) => void) | null = null

  const sortedSessions = computed(() => sessionManager.value.getOrderedSessions())

  const init = ():void => {
    if (isInitialized.value === true || loadSessionFunction) return

    loadSessionFunction = (_: Electron.IpcRendererEvent, sessions: Session[]) => {
      console.log('收到会话数据:', sessions.length, '条')
      sessions.forEach(session => {
        sessionManager.value.addSession(session)
      })
      console.log('会话数据已加载:', sessions.length, '条')

      console.log(sortedSessions.value)
    }

    window.electronAPI.on('loadSessionDataCallback', loadSessionFunction)
    window.electronAPI.send('loadSessionData')

    this.isInitialized = true
    console.log('session 数据初始化请求已发送')
  }

  const exit = (): void => {
    sessionManager.value.clear()
    isInitialized.value = false
    window.electronAPI.removeListener('loadSessionDataCallback', loadSessionFunction)
  }


  const getSession = (sessionId: number) => {
    return sessionManager.value.getSession(sessionId)
  }
  const updateSession = (sessionId: number, updates: Partial<Session>) => {
    sessionManager.value.updateSession(sessionId, updates)
  }
  const togglePin = (sessionId: number) => {
    sessionManager.value.togglePin(sessionId)
  }
  const toggleMute = (sessionId: number) => {
    sessionManager.value.toggleMute(sessionId)
  }
  const markAsRead = (sessionId: number) => {
    sessionManager.value.markSessionAsRead(sessionId)
  }
  const searchSessions = (keyword: string) => {
    return sessionManager.value.searchSessions(keyword)
  }

  return {
    sessionManager,
    sortedSessions,
    isInitialized,

    init,
    exit,

    getSession,
    updateSession,
    togglePin,
    toggleMute,
    markAsRead,
    searchSessions
  }
})
