import { ipcMain } from "electron";
import fs from "fs";
import messageDao from "@main/sqlite/dao/message-dao";
import urlUtil from "@main/util/url-util";
import { netMinIO } from "@main/util/net-util";
import log from "electron-log";

interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  timeRemaining?: number;
}

interface VideoCacheItem {
  originalPath: string;
  originalLocalPath?: string;
  thumbnailPath: string;
  thumbnailLocalPath?: string;
}

class VideoCache {
  public beginServe(): void {
    ipcMain.handle(
      "video:cache:get:original",
      async (event, params: { id: number }) => {
        try {
          const data = (await messageDao.getExtendData(
            params,
          )) as VideoCacheItem;
          if (
            data.originalLocalPath &&
            urlUtil.existLocalFile(data.originalLocalPath)
          ) {
            return urlUtil.signByApp("video", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("video");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const videoPath = todayDir + "/" + fileName;
          const videoArrayBuffer = await netMinIO.downloadVideoWithProgress(
            data.originalPath,
            {
              onProgress: (progress: DownloadProgress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "video",
                  ...progress,
                });
              },
              timeout: 60000,
            },
          );

          log.info("video:cache:get:original:下载成功");

          const videoBuffer = Buffer.from(videoArrayBuffer);
          fs.writeFileSync(videoPath, videoBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: videoPath,
          });
          return urlUtil.signByApp("video", videoPath);
        } catch (error) {
          console.error("下载原始视频失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "video",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );

    ipcMain.handle(
      "video:cache:get:thumbnail",
      async (event, params: { id: number }) => {
        try {
          const data = (await messageDao.getExtendData(
            params,
          )) as VideoCacheItem;
          if (
            data.thumbnailLocalPath &&
            urlUtil.existLocalFile(data.thumbnailLocalPath)
          ) {
            return urlUtil.signByApp("picture", data.thumbnailLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.thumbnailPath)}`;
          const imagePath = todayDir + "/" + fileName;
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.thumbnailPath,
            {
              onProgress: (progress: DownloadProgress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "thumbnail",
                  mediaType: "video",
                  ...progress,
                });
              },
              timeout: 30000,
            },
          );

          log.info("video:cache:get:thumbnail:下载成功");

          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            thumbnailLocalPath: imagePath,
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载视频缩略图失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "thumbnail",
            mediaType: "video",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );
  }
}

const videoCache = new VideoCache();
export default videoCache;
