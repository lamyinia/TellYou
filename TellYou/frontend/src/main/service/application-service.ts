import { ipcMain } from 'electron'
import applicationDao from '@main/sqlite/dao/application-dao'

class ApplicationService {
  public beginServe(): void {
    ipcMain.on('application:incoming:load', async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadIncomingApplications(pageNo, pageSize)
      event.sender.send('application:incoming:loaded', data)
    })
    ipcMain.on('application:outgoing:load', async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadOutgoingApplications(pageNo, pageSize)
      event.sender.send('application:outgoing:loaded', data)
    })
    ipcMain.on('application:incoming:approve', async (_event, { ids }) => {
      await applicationDao.approveIncoming(ids || [])
    })
    ipcMain.on('application:incoming:reject', async (_event, { ids }) => {
      await applicationDao.rejectIncoming(ids || [])
    })
    ipcMain.on('application:outgoing:cancel', async (_event, { ids }) => {
      await applicationDao.cancelOutgoing(ids || [])
    })
    ipcMain.on('application:send', async (_event, { toUserId, remark }) => {
      await applicationDao.insertApplication('', toUserId, remark)
    })
  }
}

export const applicationService = new ApplicationService()
