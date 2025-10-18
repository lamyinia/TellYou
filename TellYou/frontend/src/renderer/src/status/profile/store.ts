import { defineStore } from 'pinia'
import { reactive } from 'vue'

interface NameEntry {
  name: string
  version: string
  updatedAt: number
}

export const useProfileStore = defineStore('profile', () => {
  const names: Record<string, NameEntry> = reactive({})
  const loading = reactive<Set<string>>(new Set())
  const inflight = new Map<string, Promise<void>>()

  const getCachedVersion = (userId: string): string => names[userId]?.version ?? '0'
  // 判断是否需要更新名字
  const needRefresh = (userId: string, incomingVersion?: string): boolean => {
    const incRaw = incomingVersion ?? '0'
    const curRaw = getCachedVersion(userId)
    const inc = Number.isFinite(Number(incRaw)) ? Number(incRaw) : 0
    const cur = Number.isFinite(Number(curRaw)) ? Number(curRaw) : 0
    if (!names[userId]) return true
    if (cur === 0 && inc === 0) return true
    return inc > cur
  }

  const refreshUserName = async (userId: string): Promise<void> => {
    if (inflight.has(userId)) return inflight.get(userId)!
    const p = (async () => {
      try {
        loading.add(userId)
        const res = await window.electronAPI.getProfileName(userId)
        const name = (res?.name ?? '').toString()
        const version = (res?.version ?? '0').toString()
        console.log('name:version', name, version)
        names[userId] = { name, version, updatedAt: Date.now() }
      } catch {
        // swallow
      } finally {
        loading.delete(userId)
        inflight.delete(userId)
      }
    })()
    inflight.set(userId, p)
    return p
  }

  const ensureUser = (userId: string, incomingVersion?: string, placeholder = '未知'): string => {
    if (!userId) return placeholder
    if (!names[userId]) names[userId] = { name: placeholder, version: '0', updatedAt: 0 }
    if (needRefresh(userId, incomingVersion)) void refreshUserName(userId)
    return names[userId]?.name ?? placeholder
  }

  return {
    names,
    loading,
    ensureUser,
    refreshUserName
  }
})
