import { ipcMain } from 'electron'
import { netMaster } from '@main/util/net-util'
import { store } from '@main/index'
import { uidKey } from '@main/electron-store/key'

export enum Api {
  LOGIN = '/user-account/login',
  REGISTER = '/user-account/register',
  PULL_MAILBOX = '/message/pull-mailbox',
  ACK_CONFIRM = '/message/ack-confirm',
  SEARCH_USER = '/user-info/search-by-uid',
  GET_AVATAR_UPLOAD_URL = '/media/avatar/upload-url',
  CONFIRM_UPLOAD = '/media/avatar/upload-confirm',
  PULL_CONTACT = '/contact/pull-contact',
  PULL_APPLICATION = ''
}

class ProxyService {
  public beginServe(): void {
    ipcMain.handle('proxy:login', async (_event, params: { email: string; password: string }) => {
      const response = await netMaster.post(Api.LOGIN, params)
      return response.data.data
    })
    ipcMain.handle('proxy:register',
      async (_event, params: { email: string; password: string; nickname: string; sex: number }) => {
        const data = { code: '123456' }
        Object.assign(data, params)
        const response = await netMaster.post(Api.REGISTER, data)
        return response.data
    })
    ipcMain.handle('proxy:search:user-or-group', async (_, params: {contactId: string, contactType: number}) => {
      if (params.contactType === 1){
        const  result = await netMaster.post(Api.SEARCH_USER, {fromId: store.get(uidKey), searchedId: params.contactId})
        return result.data.data
      }
      return null
    })
  }
}

const proxyService = new ProxyService()
export default proxyService
