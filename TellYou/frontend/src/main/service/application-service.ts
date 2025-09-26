import { ipcMain } from 'electron'

class ApplicationService {
  public beginServe(): void {
    ipcMain.on('application:incoming:load', async (event, { pageNo, pageSize }) => {
      const { loadIncomingApplications } = await import('@main/sqlite/dao/application-dao')
      const data = await loadIncomingApplications(pageNo, pageSize)
      event.sender.send('application:incoming:loaded', data)
    })
    ipcMain.on('application:outgoing:load', async (event, { pageNo, pageSize }) => {
      const { loadOutgoingApplications } = await import('@main/sqlite/dao/application-dao')
      const data = await loadOutgoingApplications(pageNo, pageSize)
      event.sender.send('application:outgoing:loaded', data)
    })
    ipcMain.on('application:incoming:approve', async (event, { ids }) => {
      const { approveIncoming } = await import('@main/sqlite/dao/application-dao')
      await approveIncoming(ids || [])
    })
    ipcMain.on('application:incoming:reject', async (event, { ids }) => {
      const { rejectIncoming } = await import('@main/sqlite/dao/application-dao')
      await rejectIncoming(ids || [])
    })
    ipcMain.on('application:outgoing:cancel', async (event, { ids }) => {
      const { cancelOutgoing } = await import('@main/sqlite/dao/application-dao')
      await cancelOutgoing(ids || [])
    })
    ipcMain.on('application:send', async (event, { toUserId, remark }) => {
      const { insertApplication } = await import('@main/sqlite/dao/application-dao')
      await insertApplication('', toUserId, remark)
    })
  }
}

export const applicationService = new ApplicationService()
