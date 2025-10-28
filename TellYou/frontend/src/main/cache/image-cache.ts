import { ipcMain } from "electron";
import messageDao from "@main/sqlite/dao/message-dao";
import urlUtil from "@main/util/url-util";
import { netMinIO, type DownloadProgress } from "@main/util/net-util";
import fs from "fs";
import log from "electron-log";

interface ImageCacheItem {
  originalPath: string;
  thumbnailPath: string;
  originalLocalPath?: string;
  thumbnailLocalPath?: string;
}

class ImageCache {
  public beginServe(): void {
    ipcMain.handle(
      "image:cache:get:original",
      async (event, params: { id: number }) => {
        try {
          const data = (await messageDao.getExtendData(
            params,
          )) as ImageCacheItem;
          if (
            data.originalLocalPath &&
            urlUtil.existLocalFile(data.originalLocalPath)
          ) {
            return urlUtil.signByApp("picture", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const imagePath = todayDir + "/" + fileName;
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.originalPath,
            {
              onProgress: (progress: DownloadProgress) => {
                // 向渲染进程发送下载进度
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "image",
                  ...progress,
                });
              },
              timeout: 30000,
            },
          );
          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: imagePath,
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载原始图片失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "image",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );
    ipcMain.handle(
      "image:cache:get:thumbnail",
      async (event, params: { id: number }) => {
        try {
          log.info("image:cache:get:thumbnail开始下载", params);
          const data = (await messageDao.getExtendData(
            params,
          )) as ImageCacheItem;
          if (
            data.thumbnailLocalPath &&
            urlUtil.existLocalFile(data.thumbnailLocalPath)
          ) {
            return urlUtil.signByApp("picture", data.thumbnailLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.thumbnailPath)}`;
          const imagePath = todayDir + "/" + fileName;
          log.info("image:cache:get:thumbnail:下载路径", imagePath);
          // 使用新的进度下载方法
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.thumbnailPath,
            {
              onProgress: (progress: DownloadProgress) => {
                // 向渲染进程发送下载进度
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "thumbnail",
                  mediaType: "image",
                  ...progress,
                });
              },
              timeout: 30000,
            },
          );
          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            thumbnailLocalPath: imagePath,
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载缩略图失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "thumbnail",
            mediaType: "image",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );
  }
}
const imageCache = new ImageCache();
export default imageCache;
