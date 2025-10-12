import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SessionManager, Session } from '@renderer/status/session/class'


/**
 * 聚合会话和联系的状态管理工具类，方法有添加会话、删除会话、确定置顶、取消置顶、从sqlite加载数据、标记会话已
 * 读、更新最后消息、设置静音、取消静音、搜索会话
 * @author lanye
 * @date 2025/10/12 15:35
 */
export const useSessionStore = defineStore('session', () => {
  const sessionManager = ref(new SessionManager())
  const isInitialized = ref(false)
  const currentSessionId = ref<string>('')
  const sortedSessions = computed(() => sessionManager.value.getOrderedSessions())
  let loadSessionListener: ((...args: unknown[]) => void) | null = null

  const init = (): void => {
    console.log('sessionStore 开始初始化')
    if (isInitialized.value === true || loadSessionListener) return

    loadSessionListener = (...args: unknown[]) => {
      const [, sessions] = args as [Electron.IpcRendererEvent, Session[]]
      console.log('收到会话数据:', sessions.length, '条')
      sessions.forEach((session) => {
        sessionManager.value.addSession(session)
      })
      console.log('会话数据已加载:', sessions.length, '条')
      console.log(sortedSessions.value)
    }
    window.electronAPI.on('session:call-back:load-data', loadSessionListener)
    window.electronAPI.send('session:load-data')

    isInitialized.value = true
    console.log('sessionStore 初始化完成')
  }
  const destroy = (): void => {
    sessionManager.value.clear()
    isInitialized.value = false
    window.electronAPI.removeListener('session:call-back:load-data', loadSessionListener!)
  }
  const getSession = (sessionId: string | number): Session | undefined => {
    return sessionManager.value.getSession(String(sessionId))
  }
  const updateSession = async (sessionId: string | number, updates: Partial<Session>): Promise<void> => {
    console.info('更新{}的信息:{}', sessionId, updates)
    await window.electronAPI.invoke('session:update:partial', updates, sessionId)
    sessionManager.value.updateSession(String(sessionId), updates)
  }
  const searchSessions = (keyword: string): Session[] => {
    return sessionManager.value.searchSessions(keyword)
  }
  const setCurrentSessionId = (sessionId: string | number): void => {
    currentSessionId.value = String(sessionId)
  }

  return {
    init,
    destroy,
    sessionManager,
    sortedSessions,
    isInitialized,
    currentSessionId,
    getSession,
    updateSession,
    searchSessions,
    setCurrentSessionId
  }
})
