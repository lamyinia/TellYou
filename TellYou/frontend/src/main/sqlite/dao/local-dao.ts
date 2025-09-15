import { existsLocalDB, initTable, setCurrentFolder } from '@main/sqlite/atom'
import { connectWs } from '@main/websocket/client'
import { pullOfflineMessages } from '@main/pull/service'


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
const pullStrongTransactionData = async (): Promise<void> => {
  console.log(`正在拉取强事务数据...`)
  try {
    await pullFriendContact()
    await pullApply()
    await pullGroup()
    await pullBlackList()

    console.log(`拉取强事务数据完成`)
  } catch (error) {
    console.error(`拉取强事务数据失败:`, error)
    throw error
  }
}
const pullFriendContact = async (): Promise<void> => {

}
const pullApply = async (): Promise<void> => {

}
const pullGroup = async (): Promise<void> => {

}
const pullBlackList = async (): Promise<void> => {

}
