import { defineStore } from "pinia";
import { reactive } from "vue";
import type {
  MediaSendParams,
  MediaTask,
  MediaTaskResult,
  MediaTaskStatus,
} from "./class";

export const useMediaStore = defineStore("media", () => {
  const activeTasks = reactive<Record<string, MediaTask>>({});
  const startTask = async (
    params: MediaSendParams,
  ): Promise<MediaTaskResult> => {
    try {
      const result = await window.electronAPI.startMediaTask({
        type: params.type,
        filePath: params.filePath,
        fileName: params.fileName,
        mimeType: params.mimeType,
      });

      if (result.success && result.taskId) {
        const task: MediaTask = {
          id: result.taskId,
          type: params.type,
          filePath: params.filePath,
          fileName: params.fileName,
          fileSize: 0, // 将在后续更新
          mimeType: params.mimeType,
          status: "pending" as MediaTaskStatus,
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        activeTasks[result.taskId] = task;
      }

      return result;
    } catch (error) {
      return {
        taskId: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return {
    activeTasks,
    startTask,
  };
});
