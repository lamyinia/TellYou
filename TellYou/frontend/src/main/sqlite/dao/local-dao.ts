import { existsLocalDB, initTable, setCurrentFolder } from '@main/sqlite/sqlite-operation'
import { connectWs } from '@main/client/websocket-client'
import { logger } from '../../../utils/log-util'


/************************************************** 数据访问层业务接口 *************************************************************/

export const initializeUserData = async (uid: string): Promise<void> => {
  connectWs()
  setCurrentFolder(uid)
  const everCreated: boolean = existsLocalDB()
  await initTable()
  await pullStrongTransactionData()
  if (!everCreated) {
    await pullHistoryMessage()
  }
}


/*************************************** 拉取服务 ***************************************/
const pullStrongTransactionData = async (): Promise<void> => {
  logger.info(`正在拉取强事务数据...`)
  try {
    await pullFriendContact()

    await pullApply()

    await pullGroup()

    await pullBlackList()

    await pullOfflineMessage()

    logger.info(`拉取强事务数据完成`)
  } catch (error) {
    logger.info(`拉取强事务数据失败:`, error)
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
const pullOfflineMessage = async (): Promise<void> => {

}
const pullHistoryMessage = async (): Promise<void> => {
  console.log(`正在拉取历史消息...`)
}
