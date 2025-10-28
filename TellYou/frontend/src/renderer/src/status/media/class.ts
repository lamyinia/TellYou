// 媒体任务状态枚举
export enum MediaTaskStatus {
  PENDING = "pending",
  UPLOADING = "uploading",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// 媒体类型枚举
export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  FILE = "file",
}

// 媒体任务接口
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
  chunkCursor?: number;
}

// 媒体发送参数
export interface MediaSendParams {
  type: MediaType;
  filePath: string;
  fileName: string;
  mimeType: string;
}

// 媒体任务结果
export interface MediaTaskResult {
  taskId: string;
  success: boolean;
  result?: {
    originUrl: string;
    thumbnailUrl?: string;
    fileId: string;
  };
  error?: string;
}

// 媒体任务状态更新
export interface MediaTaskStateUpdate {
  taskId: string;
  status: MediaTaskStatus;
  progress: number;
}

// 媒体任务进度更新
export interface MediaTaskProgressUpdate {
  taskId: string;
  progress: number;
  chunkCursor?: number;
}
