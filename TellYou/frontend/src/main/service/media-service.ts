import { app, ipcMain } from "electron";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { mediaUtil } from "@main/util/media-util";
import { netMaster, netMinIO } from "@main/util/net-util";

export enum MediaTaskStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
}

export interface MediaTask {
  id: string;
  type: MediaType;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: MediaTaskStatus;
  progress: number;
  error?: string;
  uploadUrls?: {
    origin: string;
    thumbnail?: string;
  };
  result?: {
    originUrl: string;
    thumbnailUrl?: string;
    fileId: string;
  };
  createdAt: number;
  updatedAt: number;
  chunkCursor?: number; // 分块上传游标
}

class MediaTaskService {
  private tasks = new Map<string, MediaTask>();
  private tempDir: string = "";
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 分块

  public beginServe(): void {
    ffmpeg.setFfmpegPath(ffmpegStatic as string);
    this.tempDir = join(app.getPath("userData"), ".tellyou", "media", "temp");
    this.ensureTempDir();
    this.setupIpcHandlers();
  }

  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private setupIpcHandlers(): void {
    ipcMain.handle(
      "media:send:start",
      async (
        event,
        params: {
          type: MediaType;
          filePath: string;
          fileName: string;
          mimeType: string;
        },
      ) => {},
    );
    ipcMain.handle(
      "media:avatar:upload",
      async (_, { filePath, fileSize, fileSuffix }) => {
        try {
          console.log("开始上传头像:", { filePath, fileSize, fileSuffix });
          const uploadUrls = await netMaster.getUserAvatarUploadUrl(
            fileSize,
            fileSuffix,
          );
          const mediaFile = await mediaUtil.getNormal(filePath);
          const originalFile = await mediaUtil.processImage(
            mediaFile,
            "original",
          );
          const thumbnailFile = await mediaUtil.processImage(
            mediaFile,
            "thumb",
          );
          await netMinIO.simpleUploadFile(
            uploadUrls.originalUploadUrl,
            originalFile.compressedBuffer,
            originalFile.newMimeType,
          );
          await netMinIO.simpleUploadFile(
            uploadUrls.thumbnailUploadUrl,
            thumbnailFile.compressedBuffer,
            thumbnailFile.newMimeType,
          );
          await netMaster.confirmUserAvatarUploaded(uploadUrls);
          console.log("确认上传完成头像URL:", uploadUrls.originalUploadUrl);
          return {
            success: true,
            avatarUrl: uploadUrls.originalUploadUrl.split("?")[0],
          };
        } catch (error) {
          console.error("Failed to upload avatar:", error);
          throw error;
        }
      },
    );
  }
}

export const mediaTaskService = new MediaTaskService();
