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
interface VoiceCacheItem {
  originalPath: string;
  originalLocalPath?: string;
}

class VoiceCache {
  public beginServe(): void {
    ipcMain.handle(
      "voice:cache:get:original",
      async (event, params: { id: number }) => {
        try {
          const data = (await messageDao.getExtendData(
            params,
          )) as VoiceCacheItem;
          if (
            data.originalLocalPath &&
            urlUtil.existLocalFile(data.originalLocalPath)
          ) {
            return urlUtil.signByApp("voice", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("voice");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const voicePath = todayDir + "/" + fileName;
          const voiceArrayBuffer = await netMinIO.downloadAudioWithProgress(
            data.originalPath,
            {
              onProgress: (progress: DownloadProgress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "voice",
                  ...progress,
                });
              },
              timeout: 30000,
            },
          );
          const voiceBuffer = Buffer.from(voiceArrayBuffer);
          fs.writeFileSync(voicePath, voiceBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: voicePath,
          });
          return urlUtil.signByApp("voice", voicePath);
        } catch (error) {
          console.error("下载语音失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "voice",
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    );
  }
}

const voiceCache = new VoiceCache();
export default voiceCache;
