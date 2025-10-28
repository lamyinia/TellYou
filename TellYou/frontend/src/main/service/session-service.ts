import { ipcMain } from "electron";
import sessionDao from "@main/sqlite/dao/session-dao";
import { Session } from "@shared/types/session";
import messageDao from "@main/sqlite/dao/message-dao";
import { netMaster } from "@main/util/net-util";
import { Api } from "@main/service/proxy-service";
import objectUtil from "@main/util/object-util";

class SessionService {
  public beginServe(): void {
    ipcMain.handle(
      "session:update:partial",
      async (_, params: any, sessionId: string) => {
        return await sessionDao.updatePartialBySessionId(params, sessionId);
      },
    );
    ipcMain.on("session:load-data", async (event) => {
      console.log("开始查询session");
      const result: Session[] = await sessionDao.selectSessions();
      console.log("查询结果:", result);
      event.sender.send("session:call-back:load-data", result);
    });
  }
  // 填充会话的消息
  public async fillSession(contactList: Contact[]): Promise<void> {
    const groupList: string[] = [];
    const userList: string[] = [];
    const promiseList: Promise<any>[] = [];
    contactList.forEach((contact) => {
      promiseList.push(sessionService.insertAndCheckSession(contact));
    });
    const resultList = await Promise.all(promiseList);
    for (const result of resultList) {
      if (result && result.contactId) {
        if (result.contactType === 1) {
          userList.push(result.contactId);
        } else if (result.contactType === 2) {
          groupList.push(result.contactId);
        }
      }
    }
    if (userList.length > 0) {
      console.info(
        "session-service:fill-session:需要获取用户信息，数量:",
        userList.length,
      );
      try {
        const response = await netMaster.post(Api.GET_BASE_USER, {
          targetList: userList,
        });
        if (response.data.success) {
          const data = response.data.data;
          console.info(
            "session-service:fill-session:获取用户信息成功，数量:",
            data.userInfoList?.length || 0,
          );
          await sessionService.updateBaseUserInfoList(data.userInfoList);
        } else {
          console.error(
            "session-service:fill-session:获取用户信息失败:",
            response.data.errMsg,
          );
        }
      } catch (error) {
        console.error("session-service:fill-session:获取用户信息异常:", error);
      }
    }
    if (groupList.length > 0) {
      console.info(
        "session-service:fill-session:需要获取群组信息，数量:",
        groupList.length,
      );
      try {
        const response = await netMaster.post(Api.GET_BASE_GROUP, {
          targetList: groupList,
        });
        if (response.data.success) {
          const data = response.data.data;
          console.info(
            "session-service:fill-session:获取群组信息成功，数量:",
            data.groupInfoList?.length || 0,
          );
          await sessionService.updateBaseGroupInfoList(data.groupInfoList);
        } else {
          console.error(
            "session-service:fill-session:获取群组信息失败:",
            response.data.errMsg,
          );
        }
      } catch (error) {
        console.error("session-service:fill-session:获取群组信息异常:", error);
      }
    }
  }
  public async selectSingleSessionById(sessionId: string): Promise<Session> {
    return sessionDao.selectSingleSession(sessionId);
  }
  // 批量设置用户头像、名字
  public async updateBaseUserInfoList(list: any[]): Promise<void> {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        { contactName: info.nickname, contactAvatar: info.avatar },
        info.userId,
      );
    }
  }
  // 批量设置群组头像、群名
  public async updateBaseGroupInfoList(list: any[]): Promise<void> {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        { contactName: info.groupName, contactAvatar: info.avatar },
        info.groupId,
      );
    }
  }
  // 如果插入后发现不存在，或者 contact_name 或者 contact_avatar 字段缺失，返回 contact，代表要查 api
  public async insertAndCheckSession(contact: Contact): Promise<any> {
    const obj = {
      sessionId: contact.sessionId,
      contactType: contact.contactType,
      contactId: contact.contactId,
    };
    if (contact.myRole) Object.assign(obj, { myRole: contact.myRole });
    const change = await sessionDao.insertOrIgnoreContact(obj);
    console.info("session-service:check-session:insert:", obj);
    if (change > 0) {
      return contact;
    } else {
      await sessionDao.updatePartialBySessionId(
        { status: 1 } as Partial<Session>,
        contact.sessionId,
      );
    }
    const one = await sessionDao.selectSingleSession(contact.sessionId);
    if (one?.contactAvatar && one?.contactName) {
      // session 存在且信息完整
      return { sessionId: contact.sessionId };
    } else {
      return contact;
    }
  }
  // 退群或者被删，会话被弃用
  public async deprecateSession(sessionId: string): Promise<void> {
    await sessionDao.updatePartialBySessionId(
      { status: 0 } as Partial<Session>,
      sessionId,
    );
  }
  // 整理所有会话的最后一条消息
  public async tidySessionOfLastMessage(): Promise<void> {
    const result: Array<{ sessionId: string }> =
      await sessionDao.selectAllSessionId();
    for (const session of result) {
      const msgResult: any = await messageDao.getMessageBySessionId(
        session.sessionId,
        { limit: 1, direction: "newest" },
      );
      if (msgResult.messages.length > 0) {
        const content = objectUtil.getContentByMessage(msgResult.messages[0]);
        const obj = {
          lastMsgTime: msgResult.messages[0].timestamp.toISOString(),
          lastMsgContent: content,
        };
        console.info(
          "session-service:tidy-session:update-session:",
          obj,
          session.sessionId,
        );
        await sessionDao.updatePartialBySessionId(
          obj as Partial<Session>,
          session.sessionId,
        );
      } else {
        console.info(
          "session-service:tidy-session:no-message:",
          session.sessionId,
        );
      }
    }
  }
}

export interface Contact {
  sessionId: string;
  contactId: string;
  myRole?: number;
  contactType: number;
}

export const sessionService = new SessionService();
