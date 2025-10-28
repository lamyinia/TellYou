import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { BlackItem, PageInfo } from "@renderer/status/black/class";

export const useBlackStore = defineStore("black", () => {
  const list = ref<BlackItem[]>([]);
  const page = reactive<PageInfo>({ pageNo: 1, pageSize: 8, total: 0 });

  let unsubLoaded: ((...args: unknown[]) => void) | null = null;

  const init = (): void => {
    console.log("blackStore 开始初始化");

    if (unsubLoaded) return;
    unsubLoaded = (...args: unknown[]) => {
      const [, payload] = args as [
        Electron.IpcRendererEvent,
        { list: BlackItem[]; total: number },
      ];
      list.value = payload.list;
      page.total = payload.total;
    };
    window.electronAPI.on("black:list:loaded", unsubLoaded);
    window.electronAPI.send("black:list:load", {
      pageNo: page.pageNo,
      pageSize: page.pageSize,
    });
    console.log("blackStore 初始化完成");
  };

  const destroy = (): void => {
    if (unsubLoaded)
      window.electronAPI.removeListener("black:list:loaded", unsubLoaded);
    unsubLoaded = null;
  };

  const reload = (pageNo = 1): void => {
    page.pageNo = pageNo;
    window.electronAPI.send("black:list:load", {
      pageNo,
      pageSize: page.pageSize,
    });
  };

  const bulkRemove = (userIds: string[]): void => {
    window.electronAPI.send("black:list:remove", { userIds });
  };

  return { list, page, init, destroy, reload, bulkRemove };
});
