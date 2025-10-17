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
  PULL_APPLICATION = '',
  GET_BASE_USER = '/user-info/base-info-list',
  GET_BASE_GROUP = '/group/base-info-list',
  SEND_FRIEND_APPLY = '/contact/friend-apply-send'
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
    ipcMain.handle('proxy:search:user-or-group', async (_, params: { contactId: string, contactType: number }) => {
      if (params.contactType === 1) {
        const result = await netMaster.post(Api.SEARCH_USER, {
          fromId: store.get(uidKey),
          searchedId: params.contactId
        })
        return result.data.data
      }
      return null
    })
    // 发起好友申请
    ipcMain.handle('proxy:application:send-user', async (_, params: { contactId: string, description: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.post(Api.SEND_FRIEND_APPLY, params)
        return response.data // 这里本身是 { success, errCode, errMsg, data }
      } catch (e: any) {
        if (e?.name === 'ApiError') {  // 不要把原始 Error 往渲染进程扔, 将错误扁平化为可序列化对象
          return { success: false, errCode: e.errCode ?? -1, errMsg: e.errMsg ?? '请求失败' }
        }
        return { success: false, errCode: -1, errMsg: e?.message || '网络或系统异常' }
      }
    })
    // 发起群组申请
    ipcMain.handle('proxy:application:send-group', async (_, params: any) => {
      return null
    })
    ipcMain.handle('proxy:application:accept-friend', async (_, params: any) => {
      return null
    })
    ipcMain.handle('proxy:application:accept-group-member', async (_, params: any) => {
      return null
    })
    ipcMain.handle('proxy:group:create-group', async (_, params: any) => {
      return null
    })
    ipcMain.handle('proxy:group:invite-friend', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:dissolve-group', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:leave-group', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:kick-out-member', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:modify-group-name', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:modify-group-card', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:transfer-owner', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:add-manager', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:withdraw-manager', async (_, params: any) => {

    })
    ipcMain.handle('proxy:group:get-member-list', async (_, params: any) => {

    })
  }
}

const proxyService = new ProxyService()
export default proxyService
