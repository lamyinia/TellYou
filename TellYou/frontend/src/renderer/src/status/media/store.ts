import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type {
  MediaTask,
  MediaTaskStatus,
  MediaType,
  MediaSendParams,
  MediaTaskResult
} from './class'

export const useMediaStore = defineStore('media', () => {
  // 当前活跃的任务
  const activeTasks = reactive<Record<string, MediaTask>>({})
  
  // 任务历史
  const taskHistory = ref<MediaTask[]>([])
  
  // 最大历史记录数
  const MAX_HISTORY = 50

  // 开始媒体任务
  const startTask = async (params: MediaSendParams): Promise<MediaTaskResult> => {
    try {
      const result = await window.electronAPI.startMediaTask({
        type: params.type,
        filePath: params.filePath,
        fileName: params.fileName,
        mimeType: params.mimeType
      })

      if (result.success && result.taskId) {
        // 创建本地任务对象
        const task: MediaTask = {
          id: result.taskId,
          type: params.type,
          filePath: params.filePath,
          fileName: params.fileName,
          fileSize: 0, // 将在后续更新
          mimeType: params.mimeType,
          status: 'pending' as MediaTaskStatus,
          progress: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        activeTasks[result.taskId] = task
      }

      return result
    } catch (error) {
      return {
        taskId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // 取消任务
  const cancelTask = async (taskId: string): Promise<boolean> => {
    try {
      const success = await window.electronAPI.cancelMediaTask(taskId)
      if (success && activeTasks[taskId]) {
        activeTasks[taskId].status = 'cancelled' as MediaTaskStatus
        moveToHistory(activeTasks[taskId])
        delete activeTasks[taskId]
      }
      return success
    } catch (error) {
      console.error('Failed to cancel task:', error)
      return false
    }
  }

  // 重试任务
  const retryTask = async (taskId: string): Promise<boolean> => {
    try {
      const success = await window.electronAPI.retryMediaTask(taskId)
      if (success && activeTasks[taskId]) {
        activeTasks[taskId].status = 'pending' as MediaTaskStatus
        activeTasks[taskId].progress = 0
        activeTasks[taskId].error = undefined
      }
      return success
    } catch (error) {
      console.error('Failed to retry task:', error)
      return false
    }
  }

  // 获取任务状态
  const getTaskStatus = async (taskId: string): Promise<MediaTask | null> => {
    try {
      const status = await window.electronAPI.getMediaTaskStatus(taskId)
      if (status && activeTasks[taskId]) {
        Object.assign(activeTasks[taskId], status)
      }
      return status
    } catch (error) {
      console.error('Failed to get task status:', error)
      return null
    }
  }

  // 获取所有任务
  const getAllTasks = async (): Promise<MediaTask[]> => {
    try {
      const tasks = await window.electronAPI.getAllMediaTasks()
      return tasks
    } catch (error) {
      console.error('Failed to get all tasks:', error)
      return []
    }
  }

  // 更新任务状态
  const updateTaskStatus = (taskId: string, status: MediaTaskStatus, progress: number = 0) => {
    if (activeTasks[taskId]) {
      activeTasks[taskId].status = status
      activeTasks[taskId].progress = progress
      activeTasks[taskId].updatedAt = Date.now()
    }
  }

  // 更新任务进度
  const updateTaskProgress = (taskId: string, progress: number, chunkCursor?: number) => {
    if (activeTasks[taskId]) {
      activeTasks[taskId].progress = progress
      if (chunkCursor !== undefined) {
        activeTasks[taskId].chunkCursor = chunkCursor
      }
      activeTasks[taskId].updatedAt = Date.now()
    }
  }

  // 完成任务
  const completeTask = (taskId: string, result: {
    originUrl: string
    thumbnailUrl?: string
    fileId: string
  }): void => {
    if (activeTasks[taskId]) {
      activeTasks[taskId].status = 'completed' as MediaTaskStatus
      activeTasks[taskId].progress = 100
      activeTasks[taskId].result = result
      activeTasks[taskId].updatedAt = Date.now()
      
      // 移动到历史记录
      moveToHistory(activeTasks[taskId])
      delete activeTasks[taskId]
    }
  }

  // 任务失败
  const failTask = (taskId: string, error: string): void => {
    if (activeTasks[taskId]) {
      activeTasks[taskId].status = 'failed' as MediaTaskStatus
      activeTasks[taskId].error = error
      activeTasks[taskId].updatedAt = Date.now()
    }
  }

  // 移动到历史记录
  const moveToHistory = (task: MediaTask): void => {
    taskHistory.value.unshift(task)
    
    // 限制历史记录数量
    if (taskHistory.value.length > MAX_HISTORY) {
      taskHistory.value = taskHistory.value.slice(0, MAX_HISTORY)
    }
  }

  // 清空历史记录
  const clearHistory = (): void => {
    taskHistory.value = []
  }

  // 获取活跃任务列表
  const getActiveTasks = (): MediaTask[] => {
    return Object.values(activeTasks)
  }

  // 获取指定类型的活跃任务
  const getActiveTasksByType = (type: MediaType): MediaTask[] => {
    return Object.values(activeTasks).filter(task => task.type === type)
  }

  // 获取任务统计
  const getTaskStats = (): {
    active: {
      total: number
      uploading: number
      pending: number
      failed: number
    }
    history: {
      total: number
      completed: number
      failed: number
      cancelled: number
    }
  } => {
    const active = Object.values(activeTasks)
    const history = taskHistory.value
    
    return {
      active: {
        total: active.length,
        uploading: active.filter(t => t.status === 'uploading').length,
        pending: active.filter(t => t.status === 'pending').length,
        failed: active.filter(t => t.status === 'failed').length
      },
      history: {
        total: history.length,
        completed: history.filter(t => t.status === 'completed').length,
        failed: history.filter(t => t.status === 'failed').length,
        cancelled: history.filter(t => t.status === 'cancelled').length
      }
    }
  }

  return {
    // 状态
    activeTasks,
    taskHistory,
    
    // 方法
    startTask,
    cancelTask,
    retryTask,
    getTaskStatus,
    getAllTasks,
    updateTaskStatus,
    updateTaskProgress,
    completeTask,
    failTask,
    clearHistory,
    getActiveTasks,
    getActiveTasksByType,
    getTaskStats
  }
})
