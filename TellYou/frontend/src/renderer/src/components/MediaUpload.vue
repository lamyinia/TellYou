<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMediaStore } from '@renderer/status/media/store'
import type { MediaType, MediaTask } from '@renderer/status/media/class'

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  maxSize?: number // MB
  types?: MediaType[]
}>(), {
  accept: '*/*',
  multiple: true,
  maxSize: 100,
  types: () => ['image', 'video', 'audio', 'file']
})

const emit = defineEmits<{
  (e: 'uploaded', result: { originUrl: string; thumbnailUrl?: string; fileId: string }): void
  (e: 'error', error: string): void
}>()

const mediaStore = useMediaStore()
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref<string>('')

// 计算接受的文件类型
const acceptTypes = computed(() => {
  if (props.accept !== '*/*') return props.accept

  const typeMap = {
    image: 'image/*',
    video: 'video/*',
    audio: 'audio/*',
    file: '*/*'
  }

  return props.types.map(type => typeMap[type]).join(',')
})

// 获取活跃任务
const activeTasks = computed(() => mediaStore.getActiveTasks())

// 选择文件
const selectFile = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (!files || files.length === 0) return

  error.value = ''

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    await uploadFile(file)
  }

  // 清空输入
  target.value = ''
}

// 上传文件
const uploadFile = async (file: File) => {
  try {
    // 检查文件大小
    if (file.size > props.maxSize * 1024 * 1024) {
      throw new Error(`文件大小超过限制 (${props.maxSize}MB)`)
    }

    // 检查文件类型
    const fileType = getFileType(file)
    if (!props.types.includes(fileType)) {
      throw new Error(`不支持的文件类型: ${file.type}`)
    }

    // 开始上传任务
    const result = await mediaStore.startTask({
      type: fileType,
      filePath: file.path || file.name, // 在Electron中，file.path可能可用
      fileName: file.name,
      mimeType: file.type
    })

    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '上传失败'
    error.value = errorMsg
    emit('error', errorMsg)
  }
}

// 获取文件类型
const getFileType = (file: File): MediaType => {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  return 'file'
}

// 获取任务图标
const getTaskIcon = (type: MediaType): string => {
  const iconMap = {
    image: 'iconfont icon-image',
    video: 'iconfont icon-video',
    audio: 'iconfont icon-music',
    file: 'iconfont icon-file'
  }
  return iconMap[type]
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap = {
    pending: '等待中',
    uploading: '上传中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

// 取消任务
const cancelTask = async (taskId: string) => {
  await mediaStore.cancelTask(taskId)
}

// 重试任务
const retryTask = async (taskId: string) => {
  await mediaStore.retryTask(taskId)
}

// 监听任务完成
const handleTaskComplete = (task: MediaTask) => {
  if (task.status === 'completed' && task.result) {
    emit('uploaded', task.result)
  }
}

// 监听任务失败
const handleTaskFail = (task: MediaTask) => {
  if (task.status === 'failed' && task.error) {
    emit('error', task.error)
  }
}

// 监听任务状态变化
const watchTasks = () => {
  const tasks = activeTasks.value
  tasks.forEach(task => {
    if (task.status === 'completed') {
      handleTaskComplete(task)
    } else if (task.status === 'failed') {
      handleTaskFail(task)
    }
  })
}

onMounted(() => {
  // 定期检查任务状态
  const interval = setInterval(watchTasks, 1000)

  onUnmounted(() => {
    clearInterval(interval)
  })
})
</script>


<template>
  <div class="media-upload">
    <!-- 文件选择按钮 -->
    <div class="upload-trigger" @click="selectFile">
      <i class="iconfont icon-add"></i>
      <span class="upload-text">选择文件</span>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      class="hidden-input"
      :accept="acceptTypes"
      multiple
      @change="handleFileSelect"
    />

    <!-- 任务列表 -->
    <div v-if="activeTasks.length > 0" class="task-list">
      <div
        v-for="task in activeTasks"
        :key="task.id"
        class="task-item"
        :class="task.status"
      >
        <div class="task-info">
          <div class="task-icon">
            <i :class="getTaskIcon(task.type)"></i>
          </div>
          <div class="task-details">
            <div class="task-name">{{ task.fileName }}</div>
            <div class="task-status">{{ getStatusText(task.status) }}</div>
          </div>
        </div>

        <div class="task-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: task.progress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ task.progress }}%</div>
        </div>

        <div class="task-actions">
          <button
            v-if="task.status === 'uploading' || task.status === 'pending'"
            class="action-btn cancel"
            @click="cancelTask(task.id)"
            title="取消"
          >
            <i class="iconfont icon-close"></i>
          </button>
          <button
            v-if="task.status === 'failed'"
            class="action-btn retry"
            @click="retryTask(task.id)"
            title="重试"
          >
            <i class="iconfont icon-refresh"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>


<style scoped>
.media-upload {
  width: 100%;
}

.upload-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff;
}

.upload-trigger:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.upload-trigger i {
  font-size: 16px;
  margin-right: 8px;
}

.upload-text {
  font-size: 14px;
  font-weight: 500;
}

.hidden-input {
  display: none;
}

.task-list {
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
}

.task-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.task-item.completed {
  border-color: rgba(76, 175, 80, 0.5);
  background: rgba(76, 175, 80, 0.1);
}

.task-item.failed {
  border-color: rgba(244, 67, 54, 0.5);
  background: rgba(244, 67, 54, 0.1);
}

.task-item.cancelled {
  border-color: rgba(158, 158, 158, 0.5);
  background: rgba(158, 158, 158, 0.1);
}

.task-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.task-icon {
  margin-right: 8px;
  color: #64b5f6;
}

.task-details {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-status {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
}

.task-progress {
  display: flex;
  align-items: center;
  margin: 0 12px;
  min-width: 80px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-right: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #64b5f6, #42a5f5);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #bbb;
  min-width: 30px;
  text-align: right;
}

.task-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 12px;
}

.action-btn.cancel {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.action-btn.cancel:hover {
  background: rgba(244, 67, 54, 0.3);
}

.action-btn.retry {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.action-btn.retry:hover {
  background: rgba(76, 175, 80, 0.3);
}

.error-message {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  color: #f44336;
  font-size: 12px;
}
</style>
