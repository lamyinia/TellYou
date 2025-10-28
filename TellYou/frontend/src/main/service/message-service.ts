import { ipcMain } from "electron";
import messageDao from "@main/sqlite/dao/message-dao";
import sessionDao from "@main/sqlite/dao/session-dao";
import messageAdapter from "@main/sqlite/adapter/message-adapter";
import channelUtil from "@main/util/channel-util";
import objectUtil from "@main/util/object-util";

class MessageService {
  public beginServe(): void {
    ipcMain.handle("websocket:send", async (_, msg) => {
      console.log(msg);
      try {
        channelUtil.sendText(msg);
        console.log("发送成功");
        return true;
      } catch (error) {
        console.error("发送消息失败:", error);
        return false;
      }
    });
    ipcMain.handle(
      "message:get-by-sessionId",
      (_, sessionId: string | number, options: any) => {
        return messageDao.getMessageBySessionId(String(sessionId), options);
      },
    );
  }

  public async handleSingleMessage(message: any): Promise<number> {
    console.log("message-service:handle-single-message", message);
    const messageData = messageAdapter.adaptToDatabaseMessage(message);
    const msgId: number = await messageDao.addLocalMessage(messageData);

    await sessionDao.keepSessionFresh({
      content: objectUtil.getContentByRow(messageData),
      sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
      sessionId: message.sessionId,
    });
    return msgId;
  }

  public async getExtendData(params: { id: number }): Promise<any> {
    return messageDao.getExtendData(params);
  }
}

export const messageService = new MessageService();
