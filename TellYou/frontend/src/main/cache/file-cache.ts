import { ipcMain } from "electron";
import fs from "fs";
import messageDao from "@main/sqlite/dao/message-dao";
import urlUtil from "@main/util/url-util";
import { netMinIO } from "@main/util/net-util";

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  timeRemaining?: number;
}

interface FileCacheItem {
  originalPath: string;
  originalLocalPath?: string;
}

class FileCache {
  public beginServe(): void {
    ipcMain.handle(
      "file:cache:get:original",
      async (event, params: { id: number }) => {
        try {
          const data = (await messageDao.getExtendData(
            params,
          )) as FileCacheItem;
          if (
            data.originalLocalPath &&
            urlUtil.existLocalFile(data.originalLocalPath)
          ) {
            return urlUtil.signByApp("file", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("file");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const filePath = todayDir + "/" + fileName;
          const fileArrayBuffer = await netMinIO.downloadFileWithProgress(
            data.originalPath,
            {
              onProgress: (progress: DownloadProgress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "file",
                  ...progress,
                });
              },
              timeout: 60000,
            },
          );
          const fileBuffer = Buffer.from(fileArrayBuffer);
          fs.writeFileSync(filePath, fileBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: filePath,
          });
          return urlUtil.signByApp("file", filePath);
        } catch (error) {
          console.error("下载文件失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "file",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );
  }
}

const fileCache = new FileCache();
export default fileCache;
