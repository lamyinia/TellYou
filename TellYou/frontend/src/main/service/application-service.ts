import { ipcMain } from 'electron'
import applicationDao from '@main/sqlite/dao/application-dao'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'

class ApplicationService {
  public beginServe(): void {
    ipcMain.on('application:incoming:load', async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadIncomingApplications(pageNo, pageSize, store.get(uidKey))
      event.sender.send('application:incoming:loaded', data)
    })
    ipcMain.on('application:outgoing:load', async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadOutgoingApplications(pageNo, pageSize, store.get(uidKey))
      event.sender.send('application:outgoing:loaded', data)
    })
  }

  // 插入数据库，不负责创建会话，就算是好友同意，也应该与创建会话业务分离
  public async handleSingleApplication(msg: any): Promise<void> {
    await applicationDao.deleteApplication(msg.applyId)
    await applicationDao.insertApplication(msg)
  }
  public async handleMoreApplication(): Promise<void> {

  }

}

export const applicationService = new ApplicationService()
