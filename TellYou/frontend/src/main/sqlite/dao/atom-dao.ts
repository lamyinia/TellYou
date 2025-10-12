import { initTable, redirectDataBase } from '@main/sqlite/atom'
import { connectWs } from '@main/websocket/client'
import { pullService } from '@main/service/pull-service'
import urlUtil from '@main/util/url-util'
import { sessionService } from '@main/service/session-service'

class AtomDao {
  public async initializeUserData(userId: string): Promise<void> {
    connectWs()
    urlUtil.redirectSqlPath(userId)
    if (!redirectDataBase()) {
      console.info('initializeUserData: 未检测到本地数据库，新创建数据库')
    }
    await initTable()
    await pullService.pullStrongTransactionData()
    await pullService.pullMailboxMessages()
    await sessionService.tidySession()
  }
}

const atomDao = new AtomDao()
export default atomDao
