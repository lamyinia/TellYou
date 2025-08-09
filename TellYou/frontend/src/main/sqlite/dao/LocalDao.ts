import { existsLocalDB, initTable, setCurrentFolder } from '@main/sqlite/SqliteOperation'
import { connectWs } from '@main/WebSocketClient'
import { logger } from '../../../utils/LogUtil'


/************************************************** 数据访问层业务接口 *************************************************************/

export const initializeUserData = async (uid: string): Promise<void> => {
  connectWs()
  setCurrentFolder(uid)
  const everCreated: boolean = existsLocalDB()
  initTable()
  await pullStrongTransactionData()
  if (!everCreated) {
    await pullHistoryMessage()
  }
}


/*************************************** 拉取服务 ***************************************/
const pullStrongTransactionData = async (): Promise<void> => {
  logger.info(`正在拉取强事务数据...`)
  try {
    // 1. 拉取联系人信息
    await pullFriendContact()

    // 2. 拉取好友申请表
    await pullApply()

    // 3. 拉取群组信息
    await pullGroup()

    // 4. 拉取黑名单
    await pullBlackList()

    // 5. 拉取离线消息
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
