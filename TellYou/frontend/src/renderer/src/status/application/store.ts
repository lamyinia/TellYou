import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { FriendApplicationItem, PageInfo } from '@renderer/status/application/class'

export const useApplicationStore = defineStore('application', () => {

  const incoming = ref<FriendApplicationItem[]>([])
  const outgoing = ref<FriendApplicationItem[]>([])

  const incomingPage = reactive<PageInfo>({ pageNo: 1, pageSize: 8, total: 0 })
  const outgoingPage = reactive<PageInfo>({ pageNo: 1, pageSize: 8, total: 0 })

  let unsubIncoming: ((...args: unknown[]) => void) | null = null
  let unsubOutgoing: ((...args: unknown[]) => void) | null = null

  const init = (): void => {
    console.log('applicationStore 开始初始化')
    if (unsubIncoming || unsubOutgoing) return

    unsubIncoming = (...args: unknown[]) => {
      const [, payload] = args as [Electron.IpcRendererEvent, { list: FriendApplicationItem[]; total: number }]
      console.log('unsubIncoming 监听', payload)

      incoming.value = payload.list
      incomingPage.total = payload.total
    }
    unsubOutgoing = (...args: unknown[]) => {
      const [, payload] = args as [Electron.IpcRendererEvent, { list: FriendApplicationItem[]; total: number }]
      console.log('unsubOutgoing 监听', payload)

      outgoing.value = payload.list
      outgoingPage.total = payload.total
    }

    window.electronAPI.on('application:incoming:loaded', unsubIncoming)
    window.electronAPI.on('application:outgoing:loaded', unsubOutgoing)

    window.electronAPI.send('application:incoming:load', { pageNo: incomingPage.pageNo, pageSize: incomingPage.pageSize })
    window.electronAPI.send('application:outgoing:load', { pageNo: outgoingPage.pageNo, pageSize: outgoingPage.pageSize })
    console.log('applicationStore 初始化完成')
  }

  const destroy = (): void => {
    if (unsubIncoming) window.electronAPI.removeListener('application:incoming:loaded', unsubIncoming)
    if (unsubOutgoing) window.electronAPI.removeListener('application:outgoing:loaded', unsubOutgoing)
    unsubIncoming = null
    unsubOutgoing = null
  }

  const reloadIncoming = (pageNo = 1): void => {
    incomingPage.pageNo = pageNo
    window.electronAPI.send('application:incoming:load', { pageNo, pageSize: incomingPage.pageSize })
  }
  const reloadOutgoing = (pageNo = 1): void => {
    outgoingPage.pageNo = pageNo
    window.electronAPI.send('application:outgoing:load', { pageNo, pageSize: outgoingPage.pageSize })
  }

  const bulkApprove = (ids: string[]): void => {
    window.electronAPI.send('application:incoming:approve', { ids })
  }
  const bulkReject = (ids: string[]): void => {
    window.electronAPI.send('application:incoming:reject', { ids })
  }
  const bulkCancel = (ids: string[]): void => {
    window.electronAPI.send('application:outgoing:cancel', { ids })
  }

  const searchUser = (keyword: string): void => {
    window.electronAPI.send('application:user:search', { keyword })
  }
  const sendRequest = (toUserId: string, remark?: string): void => {
    window.electronAPI.send('application:send', { toUserId, remark })
  }

  return {
    incoming,
    outgoing,
    incomingPage,
    outgoingPage,
    init,
    destroy,
    reloadIncoming,
    reloadOutgoing,
    bulkApprove,
    bulkReject,
    bulkCancel,
    searchUser,
    sendRequest
  }
})


