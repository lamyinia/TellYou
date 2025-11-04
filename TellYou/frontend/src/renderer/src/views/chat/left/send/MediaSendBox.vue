<script setup lang="ts">
/* eslint-disable */

import { ref, computed } from "vue"
import { useSessionStore } from "@renderer/status/session/store"
import { Session } from "@shared/types/session"

const props = defineProps<{ currentContact?: Session }>()

const emit = defineEmits<{ (e: "sent"): void }>()

// 获取当前会话信息
const currentSession = computed(() => {
  return props.currentContact
})

const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const error = ref<string>("")
const selectFiles = () => {
  fileInput.value?.click()
}
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const isDuplicate = selectedFiles.value.some((existingFile) => existingFile.name === file.name && existingFile.size === file.size)
    if (!isDuplicate) {
      selectedFiles.value.push(file)
    }
  }

  target.value = ""
  error.value = ""
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// 检测文件媒体类型
const detectMediaType = (file: File): string => {
  const mimeType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|avif)$/.test(fileName)) {
    return 'image'
  }
  if (mimeType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(fileName)) {
    return 'video'
  }
  // 音频类型 (注意：这里是文件类型的音频，不是语音录制)
  if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/.test(fileName)) {
    return 'file' // 按照需求，音频文件也归类为file
  }
  return 'file'
}
const removeFile = (index: number): void => {
  selectedFiles.value.splice(index, 1)
}
const clearAllFiles = (): void => {
  selectedFiles.value = []
  error.value = ""
}
const sendAllFiles = async (): Promise<void> => {
  if (selectedFiles.value.length === 0) return

  const session = currentSession.value
  if (!session) {
    error.value = "未选择聊天对象"
    return
  }

  try {
    console.log("开始发送文件:", selectedFiles.value.length, "个文件")
    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100mb
    for (const file of selectedFiles.value) {
      if (file.size > MAX_FILE_SIZE) {
        error.value = `文件 "${file.name}" 超过大小限制（100MB）`
        return
      }
    }
    for (const file of selectedFiles.value) {
      console.log(`处理文件: ${file.name}, 大小: ${formatFileSize(file.size)}`)

      const mediaType = detectMediaType(file)

      // 读取文件内容为ArrayBuffer
      const fileBuffer = await file.arrayBuffer()

      const payload = {
        fileName: file.name,
        fileBuffer: fileBuffer,
        fileSize: file.size,
        mimeType: file.type,
        mediaType: mediaType,
        chat: {
          targetId: session.contactId,
          contactType: session.contactType,
          sessionId: session.sessionId
        }
      }

      console.log(`发送${mediaType}消息:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        mediaType
      })

      window.electronAPI.send("media:send:start-by-buffer", payload)
    }

    console.log("所有文件发送完成")
    clearAllFiles()
    emit("sent")
  } catch (err: any) {
    error.value = err.message || "发送失败"
    console.error("文件发送失败:", err)
  }
}
</script>

<template>
  <div class="media-send-box">
    <div class="file-select-section">
      <button class="select-file-btn" @click="selectFiles">
        <i class="iconfont icon-plus"></i>
        选择文件
      </button>
    </div>
    <div v-if="selectedFiles.length > 0" class="file-preview-section">
      <div class="preview-header">
        <span>已选择 {{ selectedFiles.length }} 个文件</span>
        <button class="clear-btn" @click="clearAllFiles">
          <i class="iconfont icon-close"></i>
          清空
        </button>
      </div>

      <div class="file-list">
        <div
          v-for="(file, index) in selectedFiles"
          :key="index"
          class="file-item"
        >
          <div class="file-icon">
            <i class="iconfont icon-file"></i>
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-size">{{ formatFileSize(file.size) }}</div>
          </div>
          <button class="remove-file-btn" @click="removeFile(index)">
            <i class="iconfont icon-close"></i>
          </button>
        </div>
      </div>
    </div>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="selectedFiles.length > 0" class="send-section">
      <button class="send-files-btn" @click="sendAllFiles">
        <i class="iconfont icon-send"></i>
        发送 {{ selectedFiles.length }} 个文件
      </button>
    </div>
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="*/*"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<style scoped>
.media-send-box {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  max-height: 70vh;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin: 0 24px 12px 24px;
  z-index: 4;
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.file-select-section {
  margin-bottom: 16px;
}

.select-file-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: rgba(100, 181, 246, 0.1);
  border: 2px dashed rgba(100, 181, 246, 0.3);
  border-radius: 8px;
  color: #64b5f6;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-file-btn:hover {
  background: rgba(100, 181, 246, 0.15);
  border-color: rgba(100, 181, 246, 0.5);
  transform: translateY(-1px);
}

.select-file-btn i {
  font-size: 16px;
}

/* 文件预览区域 */
.file-preview-section {
  margin-bottom: 16px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.preview-header span {
  color: #fff;
  font-size: 13px;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 4px;
  color: #f44336;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: rgba(244, 67, 54, 0.15);
}

/* 文件列表 */
.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;
}

/* 滚动条样式 */
.file-list::-webkit-scrollbar {
  width: 6px;
}

.file-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.file-list::-webkit-scrollbar-thumb {
  background: rgba(100, 181, 246, 0.5);
  border-radius: 3px;
}

.file-list::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 181, 246, 0.7);
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.file-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(100, 181, 246, 0.2);
  border-radius: 6px;
  color: #64b5f6;
}

.file-icon i {
  font-size: 16px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  word-break: break-all;
}

.file-size {
  color: #bbb;
  font-size: 12px;
}

.remove-file-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 4px;
  color: #f44336;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-file-btn:hover {
  background: rgba(244, 67, 54, 0.2);
}

.remove-file-btn i {
  font-size: 12px;
}

/* 发送按钮区域 */
.send-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.send-files-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-files-btn:hover {
  background: linear-gradient(135deg, #42a5f5, #2196f3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.send-files-btn i {
  font-size: 16px;
}

.error-message {
  color: #f44336;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 6px;
}
</style>
