import { existsLocalDB, initTable, setCurrentFolder } from '@main/sqlite/atom'
import { connectWs } from '@main/websocket/client'
import { pullService } from '@main/service/pull-service'

export const initializeUserData = async (uid: string): Promise<void> => {
  connectWs()
  setCurrentFolder(uid)
  const _everCreated: boolean = existsLocalDB()
  await initTable()
  await pullService.pullStrongTransactionData()
  await pullService.pullOfflineMessages()
}

