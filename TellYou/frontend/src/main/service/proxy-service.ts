/* eslint-disable */

import { ipcMain } from "electron";
import { netMaster, netMinIO } from "@main/util/net-util";
import { store } from "@main/index";
import { uidKey } from "@main/electron-store/key";
import urlUtil from "@main/util/url-util";
import objectUtil from "@main/util/object-util";

export enum Api {
  LOGIN = "/user-account/login",
  REGISTER = "/user-account/register",
  PULL_MAILBOX = "/message/pull-mailbox",
  ACK_CONFIRM = "/message/ack-confirm",
  SEARCH_USER = "/user-info/search-by-uid",
  GET_AVATAR_UPLOAD_URL = "/media/user-avatar/upload-url",
  CONFIRM_UPLOAD = "/media/user-avatar/upload-confirm",
  PULL_CONTACT = "/contact/pull-contact",
  PULL_APPLICATION = "/contact/cursor-pull-application",
  GET_BASE_USER = "/user-info/base-info-list",
  
  // 群组
  GET_BASE_GROUP = "/group/base-info-list",
  CREATE_GROUP = "/group/create-group",
  INVITE_FRIEND = "/group/invite-friend",
  DISSOLVE_GROUP = "/group/dissolve-group",
  LEAVE_GROUP = "/group/leave-group",
  SEND_GROUP_APPLY = "/group/send-apply",
  ACCEPT_GROUP_APPLY = "/group/accept-apply",
  KICK_OUT_MEMBER = "/group/kick-out-member",
  MODIFY_GROUP_NAME = "/group/modify-group-name",
  MODIFY_GROUP_CARD = "/group/modify-group-card",
  TRANSFER_OWNER = "/group/transfer-owner",
  ADD_MANAGER = "/group/add-manager",
  WITHDRAW_MANAGER = "/group/withdraw-manager",
  GET_MEMBER_LIST = "/group/get-member-list",

  // 好友
  SEND_FRIEND_APPLY = "/contact/friend-send-apply",
  ACCEPT_FRIEND_APPLY = "/contact/friend-accept-apply",

  // 媒体文件
  GET_PICTURE_UPLOAD_URL = "/media/picture/upload-url",
  GET_VOICE_UPLOAD_URL = "/media/voice/upload-url",
  GET_VIDEO_UPLOAD_URL = "/media/video/upload-url",
  GET_FILE_UPLOAD_URL = "/media/file/upload-url",
  CONFIRM_PICTURE_UPLOAD = "/media/picture/upload-confirm",
  CONFIRM_VOICE_UPLOAD = "/media/voice/upload-confirm",
  CONFIRM_VIDEO_UPLOAD = "/media/video/upload-confirm",
  CONFIRM_FILE_UPLOAD = "/media/file/upload-confirm",
}

class ProxyService {
  public beginServe(): void {
    ipcMain.handle("proxy:login",
      async (_event, params: { email: string; password: string }) => {
        const response = await netMaster.post(Api.LOGIN, params)
        return response.data.data
      })
    ipcMain.handle("proxy:register",
      async (_event, params: { email: string, password: string, nickname: string, sex: number }) => {
        const data = { code: "123456" }
        Object.assign(data, params)
        try {
          const response = await netMaster.post(Api.REGISTER, data)
          return response.data
        } catch (e: any) {
          return objectUtil.errorResponse(e)
        }
      })
    ipcMain.handle("proxy:search:user-or-group",
      async (_, params: { contactId: string; contactType: number }) => {
        if (params.contactType === 1) {
          const result = await netMaster.post(Api.SEARCH_USER, {
            fromId: store.get(uidKey),
            searchedId: params.contactId,
          })
          return result.data.data
        }
        return null
      })
    // 发起好友申请
    ipcMain.handle("proxy:application:send-user",
      async (_, params: { contactId: string; description: string }) => {
        Object.assign(params, { fromUserId: store.get(uidKey) })
        try {
          const response = await netMaster.post(Api.SEND_FRIEND_APPLY, params)
          return response.data
        } catch (e: any) {
          return objectUtil.errorResponse(e)
        }
      })
    // 接受好友申请
    ipcMain.handle("proxy:application:accept-friend-apply", async (_, applyId: string) => {
        const payload = { fromUserId: store.get(uidKey), applyId }
        try {
          const response = await netMaster.put(Api.ACCEPT_FRIEND_APPLY, payload)
          return response.data
        } catch (e: any) {
          return objectUtil.errorResponse(e)
        }
      })
    // 发起入群申请
    ipcMain.handle("proxy:application:send-group-apply", async (_, params: { groupId: string; description: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.post(Api.SEND_GROUP_APPLY, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:application:accept-group-member-apply", async (_, params: any) => {
      return null
    })
    ipcMain.handle("proxy:group:create-group", async (_, params: { name: string } ) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.post(Api.CREATE_GROUP, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:invite-friend", async (_, params: { groupId: string, targetIdList: string[] }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.post(Api.INVITE_FRIEND, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:dissolve-group", async (_, params: { groupId: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.delete(Api.DISSOLVE_GROUP, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:leave-group", async (_, params: { groupId: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.delete(Api.LEAVE_GROUP, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:kick-out-member", async (_, params: { groupId: string, targetIdList: string[] }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.delete(Api.KICK_OUT_MEMBER, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:modify-group-name", async (_, params: { groupId: string, name: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.put(Api.MODIFY_GROUP_NAME, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:modify-group-card", async (_, params: { groupId: string, card: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.put(Api.MODIFY_GROUP_CARD, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:transfer-owner", async (_, params: { groupId: string, targetId: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.put(Api.TRANSFER_OWNER, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:add-manager", async (_, params: { groupId: string, targetIdList: string[] }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.put(Api.ADD_MANAGER, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:withdraw-manager", async (_, params: { groupId: string, targetId: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.put(Api.WITHDRAW_MANAGER, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })
    ipcMain.handle("proxy:group:get-member-list", async (_, params: { groupId: string }) => {
      Object.assign(params, { fromUserId: store.get(uidKey) })
      try {
        const response = await netMaster.get(Api.GET_MEMBER_LIST, params)
        return response.data
      } catch (e: any) {
        return objectUtil.errorResponse(e)
      }
    })

    ipcMain.handle("profile:name:get",async (_event, { userId }: { userId: string }) => {
        try {
          const path = [urlUtil.atomPath, userId + ".json"].join("/")
          const json: any = await netMinIO.downloadJson(path)
          console.log("profile:name:get:json", json)
          const nickname: string = json?.nickname ?? json?.name ?? ""
          const nicknameVersion: string = String(json.nicknameVersion || "0")
          return { nickname, nicknameVersion }
        } catch {
          return { nickname: "", nickVersion: "0" }
        }
      })

    ipcMain.handle("profile:avatar:get",async (_event, { userId }: { userId: string }) => {
        try {
          const path = [urlUtil.atomPath, userId + ".json"].join("/")
          const json: any = await netMinIO.downloadJson(path)
          const avatarVersion: string = String(json?.avatarVersion || "0")
          console.info("profile:avatar:get", avatarVersion)
          return { avatarVersion }
        } catch {
          return { avatarVersion: "0" }
        }
      })
  }
}

const proxyService = new ProxyService()
export default proxyService;
