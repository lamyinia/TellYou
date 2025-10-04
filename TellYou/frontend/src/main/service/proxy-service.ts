import { ipcMain } from 'electron'
import { netMaster } from '@main/util/net-util'

export enum Api {
  LOGIN = '/user-account/login',
  REGISTER = '/user-account/register',
  PULL_MAILBOX = '/message/pull-mailbox',
  ACK_CONFIRM = '/message/ack-confirm',
}

class ProxyService {
  public beginServe(): void {
    ipcMain.handle('proxy:login', async (_event, params: { email: string; password: string }) => {
      const response = await netMaster.post(Api.LOGIN, params)
      return response.data.data
    })
    ipcMain.handle('proxy:register', async (_event, params: { email: string; password: string; username: string }) => {
        const response = await netMaster.post(Api.REGISTER, params)
        return response.data.data
      }
    )
  }
}

const proxyService = new ProxyService()
export default proxyService
