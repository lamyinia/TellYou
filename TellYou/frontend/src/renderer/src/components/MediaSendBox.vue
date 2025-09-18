<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MediaUpload from './MediaUpload.vue'
import type { MediaType } from '@renderer/status/media/class'

const props = defineProps<{
  currentContact?: any
}>()

const emit = defineEmits<{
  (e: 'sent'): void
}>()

// 状态
const activeTab = ref<'image' | 'video' | 'audio' | 'file'>('image')
const selectedMedia = ref<Array<{
  type: MediaType
  fileName: string
  fileSize: number
  originUrl: string
  thumbnailUrl?: string
  fileId: string
}>>([])
const error = ref<string>('')
const isRecording = ref(false)
const audioDuration = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])

// 标签页配置
const tabs = [
  { type: 'image' as const, icon: 'iconfont icon-image', label: '图片' },
  { type: 'video' as const, icon: 'iconfont icon-video', label: '视频' },
  { type: 'audio' as const, icon: 'iconfont icon-mic', label: '语音' },
  { type: 'file' as const, icon: 'iconfont icon-file', label: '文件' }
]

// 计算属性
const canSend = computed(() => {
  return selectedMedia.value.length > 0 && props.currentContact
})

// 处理媒体上传完成
const handleMediaUploaded = (result: { originUrl: string; thumbnailUrl?: string; fileId: string }) => {
  // 这里需要从上传结果中获取文件信息
  // 实际实现中需要从MediaUpload组件传递更多信息
  const media = {
    type: activeTab.value as MediaType,
    fileName: 'uploaded_file', // 需要从上传结果获取
    fileSize: 0, // 需要从上传结果获取
    originUrl: result.originUrl,
    thumbnailUrl: result.thumbnailUrl,
    fileId: result.fileId
  }

  selectedMedia.value.push(media)
  error.value = ''
}

// 处理上传错误
const handleUploadError = (errorMsg: string) => {
  error.value = errorMsg
}

// 开始录音
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    audioChunks.value = []
    audioDuration.value = 0

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }

    mediaRecorder.value.onstop = () => {
      const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
      handleAudioRecorded(audioBlob)
    }

    mediaRecorder.value.start()
    isRecording.value = true

    // 开始计时
    const timer = setInterval(() => {
      if (isRecording.value) {
        audioDuration.value++
      } else {
        clearInterval(timer)
      }
    }, 1000)

  } catch (err) {
    error.value = '无法访问麦克风'
  }
}

// 停止录音
const stopRecording = () => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false

    // 停止所有音频轨道
    mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
  }
}

// 处理录音完成
const handleAudioRecorded = (audioBlob: Blob) => {
  // 这里需要将音频文件上传
  // 实际实现中需要调用媒体上传服务
  console.log('Audio recorded:', audioBlob)
}

// 播放音频
const playAudio = () => {
  if (audioChunks.value.length > 0) {
    const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    audio.play()
  }
}

// 获取文件图标
const getFileIcon = (type: MediaType): string => {
  const iconMap = {
    image: 'iconfont icon-image',
    video: 'iconfont icon-video',
    audio: 'iconfont icon-music',
    file: 'iconfont icon-file'
  }
  return iconMap[type]
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化时长
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 移除媒体
const removeMedia = (index: number) => {
  selectedMedia.value.splice(index, 1)
}

// 清空选择
const clearSelected = () => {
  selectedMedia.value = []
  error.value = ''
}

// 发送媒体
const sendMedia = async () => {
  if (!canSend.value) return

  try {
    // 这里需要调用消息发送API
    // 实际实现中需要将媒体信息发送到后端
    console.log('Sending media:', selectedMedia.value)

    // 清空选择
    clearSelected()

    // 通知父组件
    emit('sent')

  } catch (err) {
    error.value = '发送失败'
  }
}

// 清理资源
onUnmounted(() => {
  if (mediaRecorder.value && isRecording.value) {
    stopRecording()
  }
})
</script>

<template>
  <div class="media-send-box">
    <!-- 媒体选择区域 -->
    <div class="media-selector">
      <div class="selector-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.type"
          class="tab-btn"
          :class="{ active: activeTab === tab.type }"
          @click="activeTab = tab.type"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- 图片选择 -->
      <div v-if="activeTab === 'image'" class="media-content">
        <MediaUpload
          :types="['image']"
          :max-size="10"
          accept="image/*"
          @uploaded="handleMediaUploaded"
          @error="handleUploadError"
        />
      </div>

      <!-- 视频选择 -->
      <div v-if="activeTab === 'video'" class="media-content">
        <MediaUpload
          :types="['video']"
          :max-size="100"
          accept="video/*"
          @uploaded="handleMediaUploaded"
          @error="handleUploadError"
        />
      </div>

      <!-- 语音录制 -->
      <div v-if="activeTab === 'audio'" class="media-content">
        <div class="audio-recorder">
          <button
            class="record-btn"
            :class="{ recording: isRecording }"
            @mousedown="startRecording"
            @mouseup="stopRecording"
            @mouseleave="stopRecording"
          >
            <i class="iconfont icon-mic"></i>
            <span>{{ isRecording ? '录音中...' : '按住录音' }}</span>
          </button>
          <div v-if="audioDuration > 0" class="audio-info">
            <span>录音时长: {{ formatDuration(audioDuration) }}</span>
            <button class="play-btn" @click="playAudio">
              <i class="iconfont icon-play"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 文件选择 -->
      <div v-if="activeTab === 'file'" class="media-content">
        <MediaUpload
          :types="['file']"
          :max-size="200"
          accept="*/*"
          @uploaded="handleMediaUploaded"
          @error="handleUploadError"
        />
      </div>
    </div>

    <!-- 预览区域 -->
    <div v-if="selectedMedia.length > 0" class="media-preview">
      <div class="preview-header">
        <span>已选择 {{ selectedMedia.length }} 个文件</span>
        <button class="clear-btn" @click="clearSelected">
          <i class="iconfont icon-close"></i>
          清空
        </button>
      </div>

      <div class="preview-list">
        <div
          v-for="(media, index) in selectedMedia"
          :key="index"
          class="preview-item"
        >
          <div class="preview-thumbnail">
            <img
              v-if="media.type === 'image'"
              :src="media.thumbnailUrl || media.originUrl"
              :alt="media.fileName"
            />
            <div v-else class="file-icon">
              <i :class="getFileIcon(media.type)"></i>
            </div>
          </div>

          <div class="preview-info">
            <div class="preview-name">{{ media.fileName }}</div>
            <div class="preview-size">{{ formatFileSize(media.fileSize) }}</div>
          </div>

          <button class="remove-btn" @click="removeMedia(index)">
            <i class="iconfont icon-close"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 发送按钮 -->
    <div v-if="selectedMedia.length > 0" class="send-actions">
      <button
        class="send-btn"
        :disabled="!canSend"
        @click="sendMedia"
      >
        <i class="iconfont icon-send"></i>
        发送 ({{ selectedMedia.length }})
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>



<style scoped>
.media-send-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}

.media-selector {
  margin-bottom: 16px;
}

.selector-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #bbb;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.tab-btn.active {
  background: rgba(100, 181, 246, 0.2);
  border-color: rgba(100, 181, 246, 0.4);
  color: #64b5f6;
}

.media-content {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.record-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border: none;
  border-radius: 24px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.record-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.record-btn.recording {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.audio-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #bbb;
  font-size: 12px;
}

.play-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(100, 181, 246, 0.2);
  color: #64b5f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.play-btn:hover {
  background: rgba(100, 181, 246, 0.3);
}

.media-preview {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #bbb;
  font-size: 13px;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  color: #f44336;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(244, 67, 54, 0.2);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
}

.preview-thumbnail {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon {
  color: #64b5f6;
  font-size: 18px;
}

.preview-info {
  flex: 1;
  min-width: 0;
}

.preview-name {
  font-size: 13px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-size {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: rgba(244, 67, 54, 0.3);
}

.send-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border: none;
  border-radius: 20px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.send-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: #666;
  cursor: not-allowed;
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  color: #f44336;
  font-size: 12px;
}
</style>
