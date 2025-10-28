import { ipcMain } from "electron";
import { store } from "@main/index";

class JsonStoreService {
  public beginServe(): void {
    ipcMain.handle("store-get", (_, key) => {
      return store.get(key);
    });
    ipcMain.handle("store-set", (_, key, value) => {
      store.set(key, value);
      return true;
    });
    ipcMain.handle("store-delete", (_, key) => {
      store.delete(key);
      return true;
    });
    ipcMain.handle("store-clear", () => {
      store.clear();
      return true;
    });
  }
}

export const jsonStoreService = new JsonStoreService();
