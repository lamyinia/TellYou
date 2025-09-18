<template>
  <div class="media-usage-example">
    <h3>媒体发送服务使用示例</h3>
    
    <!-- 基础使用 -->
    <div class="example-section">
      <h4>1. 基础媒体上传</h4>
      <MediaUpload
        :types="['image', 'video', 'file']"
        :max-size="50"
        @uploaded="handleUploaded"
        @error="handleError"
      />
    </div>

    <!-- 完整媒体发送框 -->
    <div class="example-section">
      <h4>2. 完整媒体发送框</h4>
      <MediaSendBox
        :current-contact="{ contactId: 'test123', sessionId: 'session123' }"
        @sent="handleSent"
      />
    </div>

    <!-- 任务状态监控 -->
    <div class="example-section">
      <h4>3. 任务状态监控</h4>
      <div class="task-monitor">
        <div class="task-stats">
          <div class="stat-item">
            <span class="stat-label">活跃任务:</span>
            <span class="stat-value">{{ taskStats.active.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">上传中:</span>
            <span class="stat-value">{{ taskStats.active.uploading }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已完成:</span>
            <span class="stat-value">{{ taskStats.history.completed }}</span>
          </div>
        </div>
        
        <div class="task-list">
          <div
            v-for="task in activeTasks"
            :key="task.id"
            class="task-item"
            :class="task.status"
          >
            <div class="task-info">
              <i :class="getTaskIcon(task.type)"></i>
              <span class="task-name">{{ task.fileName }}</span>
              <span class="task-status">{{ getStatusText(task.status) }}</span>
            </div>
            <div class="task-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: task.progress + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ task.progress }}%</span>
            </div>
            <div class="task-actions">
              <button
                v-if="task.status === 'failed'"
                class="retry-btn"
                @click="retryTask(task.id)"
              >
                重试
              </button>
              <button
                v-if="task.status === 'uploading' || task.status === 'pending'"
                class="cancel-btn"
                @click="cancelTask(task.id)"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 代码示例 -->
    <div class="example-section">
      <h4>4. 代码使用示例</h4>
      <div class="code-example">
        <pre><code>{{ codeExample }}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MediaUpload from './MediaUpload.vue'
import MediaSendBox from './MediaSendBox.vue'
import { useMediaStore } from '@renderer/status/media/store'
import type { MediaType } from '@renderer/status/media/class'

const mediaStore = useMediaStore()

// 获取活跃任务和统计信息
const activeTasks = computed(() => mediaStore.getActiveTasks())
const taskStats = computed(() => mediaStore.getTaskStats())

// 处理上传完成
const handleUploaded = (result: any) => {
  console.log('Media uploaded:', result)
}

// 处理上传错误
const handleError = (error: string) => {
  console.error('Upload error:', error)
}

// 处理发送完成
const handleSent = () => {
  console.log('Media sent successfully')
}

// 重试任务
const retryTask = async (taskId: string) => {
  await mediaStore.retryTask(taskId)
}

// 取消任务
const cancelTask = async (taskId: string) => {
  await mediaStore.cancelTask(taskId)
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

// 代码示例
const codeExample = `// 1. 在组件中使用媒体上传
import { useMediaStore } from '@renderer/status/media/store'
import MediaUpload from '@renderer/components/MediaUpload.vue'

const mediaStore = useMediaStore()

// 开始上传任务
const startUpload = async (file: File) => {
  const result = await mediaStore.startTask({
    type: 'image',
    filePath: file.path,
    fileName: file.name,
    mimeType: file.type
  })
  
  if (result.success) {
    console.log('Task started:', result.taskId)
  }
}

// 2. 监听任务状态变化
watch(() => mediaStore.activeTasks, (tasks) => {
  tasks.forEach(task => {
    if (task.status === 'completed') {
      console.log('Upload completed:', task.result)
    } else if (task.status === 'failed') {
      console.error('Upload failed:', task.error)
    }
  })
}, { deep: true })

// 3. 手动控制任务
const cancelTask = async (taskId: string) => {
  await mediaStore.cancelTask(taskId)
}

const retryTask = async (taskId: string) => {
  await mediaStore.retryTask(taskId)
}`

onMounted(() => {
  // 定期刷新任务状态
  setInterval(() => {
    mediaStore.getAllTasks()
  }, 2000)
})
</script>

<style scoped>
.media-usage-example {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.example-section {
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.example-section h4 {
  color: #64b5f6;
  margin-bottom: 15px;
  font-size: 16px;
}

.task-monitor {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 15px;
}

.task-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: #bbb;
  font-size: 13px;
}

.stat-value {
  color: #64b5f6;
  font-weight: bold;
  font-size: 14px;
}

.task-list {
  max-height: 200px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  margin-bottom: 6px;
}

.task-item.completed {
  border-color: rgba(76, 175, 80, 0.3);
  background: rgba(76, 175, 80, 0.05);
}

.task-item.failed {
  border-color: rgba(244, 67, 54, 0.3);
  background: rgba(244, 67, 54, 0.05);
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.task-name {
  color: #fff;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-status {
  color: #bbb;
  font-size: 11px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px;
  min-width: 80px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
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

.retry-btn, .cancel-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.retry-btn {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.retry-btn:hover {
  background: rgba(76, 175, 80, 0.3);
}

.cancel-btn {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.cancel-btn:hover {
  background: rgba(244, 67, 54, 0.3);
}

.code-example {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 15px;
  overflow-x: auto;
}

.code-example pre {
  margin: 0;
  color: #e0e0e0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.code-example code {
  color: inherit;
}
</style>
