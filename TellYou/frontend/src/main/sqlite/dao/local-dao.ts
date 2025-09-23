import { existsLocalDB, initTable, setCurrentFolder } from '@main/sqlite/atom'
import { connectWs } from '@main/websocket/client'
import { pullOfflineMessages, pullStrongTransactionData } from '@main/service/pull'


/************************************************** 数据访问层业务接口 *************************************************************/

export const initializeUserData = async (uid: string): Promise<void> => {
  connectWs()
  setCurrentFolder(uid)
  const everCreated: boolean = existsLocalDB()
  await initTable()
  await pullStrongTransactionData()
  await pullOfflineMessages()
}

/*************************************** 拉取服务 ***************************************/
