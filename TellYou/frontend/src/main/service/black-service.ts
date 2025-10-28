import { ipcMain } from "electron";
import blackDao from "@main/sqlite/dao/black-dao";

class BlackService {
  public beginServer(): void {
    ipcMain.on("black:list:load", async (event, { pageNo, pageSize }) => {
      const data = await blackDao.loadBlacklist(pageNo, pageSize);
      event.sender.send("black:list:loaded", data);
    });
    ipcMain.on("black:list:remove", async (_event, { userIds }) => {
      await blackDao.removeFromBlacklist(userIds || []);
    });
  }
}

export const blackService = new BlackService();
