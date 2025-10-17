import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { ApplicationItem, PageInfo } from '@shared/types/application'

export const useApplicationStore = defineStore('application', () => {
  const incoming = ref<ApplicationItem[]>([])
  const outgoing = ref<ApplicationItem[]>([])

  const incomingPage = reactive<PageInfo>({ pageNo: 1, pageSize: 8, total: 0 })
  const outgoingPage = reactive<PageInfo>({ pageNo: 1, pageSize: 8, total: 0 })

  let unsubIncoming: ((...args: unknown[]) => void) | null = null
  let unsubOutgoing: ((...args: unknown[]) => void) | null = null
  let wsIncomingReload: ((...args: unknown[]) => void) | null = null
  let wsOutgoingReload: ((...args: unknown[]) => void) | null = null

  const init = (): void => {
    console.log('applicationStore 开始初始化')
    if (unsubIncoming || unsubOutgoing) return

    unsubIncoming = (...args: unknown[]) => {
      const [, payload] = args as [
        Electron.IpcRendererEvent,
        { list: ApplicationItem[]; total: number }
      ]
      console.log('unsubIncoming 监听', payload)

      incoming.value = payload.list
      incomingPage.total = payload.total
    }
    unsubOutgoing = (...args: unknown[]) => {
      const [, payload] = args as [
        Electron.IpcRendererEvent,
        { list: ApplicationItem[]; total: number }
      ]
      console.log('unsubOutgoing 监听', payload)

      outgoing.value = payload.list
      outgoingPage.total = payload.total
    }
    wsIncomingReload = () => {
      reloadIncoming(incomingPage.pageNo)
    }
    wsOutgoingReload = () => {
      console.log('ws-outgoing-reload')
      reloadOutgoing(outgoingPage.pageNo)
    }

    window.electronAPI.on('application:incoming:loaded', unsubIncoming)
    window.electronAPI.on('application:outgoing:loaded', unsubOutgoing)
    window.electronAPI.on('income-list:call-back:load-data', wsIncomingReload)
    window.electronAPI.on('out-send-list:call-back:load-data', wsOutgoingReload)

    window.electronAPI.send('application:incoming:load', {
      pageNo: incomingPage.pageNo,
      pageSize: incomingPage.pageSize
    })
    window.electronAPI.send('application:outgoing:load', {
      pageNo: outgoingPage.pageNo,
      pageSize: outgoingPage.pageSize
    })
    console.log('applicationStore 初始化完成')
  }

  const destroy = (): void => {
    if (unsubIncoming)
      window.electronAPI.removeListener('application:incoming:loaded', unsubIncoming)
    if (unsubOutgoing)
      window.electronAPI.removeListener('application:outgoing:loaded', unsubOutgoing)
    if (wsIncomingReload)
      window.electronAPI.removeListener('income-list:call-back:load-data', wsIncomingReload)
    if (wsOutgoingReload)
      window.electronAPI.removeListener('out-send-list:call-back:load-data', wsOutgoingReload)
    unsubIncoming = null
    unsubOutgoing = null
    wsIncomingReload = null
    wsOutgoingReload = null
  }

  const reloadIncoming = (pageNo = 1): void => {
    incomingPage.pageNo = pageNo
    window.electronAPI.send('application:incoming:load', {
      pageNo,
      pageSize: incomingPage.pageSize
    })
  }
  const reloadOutgoing = (pageNo = 1): void => {
    outgoingPage.pageNo = pageNo
    window.electronAPI.send('application:outgoing:load', {
      pageNo,
      pageSize: outgoingPage.pageSize
    })
  }
  const bulkApprove = (ids: string[]): void => {
    window.electronAPI.send('application:incoming:approve', { ids })
  }

  const bulkCancel = (ids: string[]): void => {
    window.electronAPI.send('application:outgoing:cancel', { ids })
  }
  const searchUser = (keyword: string): void => {
    window.electronAPI.send('application:user:search', { keyword })
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
    bulkCancel,
    searchUser
  }
})
