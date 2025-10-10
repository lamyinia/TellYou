import { initTable, redirectDataBase } from '@main/sqlite/atom'
import { connectWs } from '@main/websocket/client'
import { pullService } from '@main/service/pull-service'
import urlUtil from '@main/util/url-util'
import { sessionService } from '@main/service/session-service'

export const initializeUserData = async (uid: string): Promise<void> => {
  connectWs()
  urlUtil.redirectSqlPath(uid)
  if (!redirectDataBase()) {
    console.info('未检测到本地数据，新创建数据库')
  }
  await initTable()
  await pullService.pullStrongTransactionData()
  await pullService.pullOfflineMessages()
  await sessionService.tidySession()
}
