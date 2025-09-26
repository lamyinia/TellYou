import { ipcMain } from 'electron'

class BlackService {
  public beginServer(): void {
    ipcMain.on('black:list:load', async (event, { pageNo, pageSize }) => {
      const { loadBlacklist } = await import('@main/sqlite/dao/black-dao')
      const data = await loadBlacklist(pageNo, pageSize)
      event.sender.send('black:list:loaded', data)
    })
    ipcMain.on('black:list:remove', async (_event, { userIds }) => {
      const { removeFromBlacklist } = await import('@main/sqlite/dao/black-dao')
      await removeFromBlacklist(userIds || [])
    })
  }
}

export const blackService = new BlackService()
