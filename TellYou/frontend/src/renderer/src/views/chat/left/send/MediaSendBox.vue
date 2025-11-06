<script setup lang="ts">
/* eslint-disable */

import { ref, computed } from "vue"
import { Session } from "@shared/types/session"
import ioUtil from "@renderer/utils/io-util"

const props = defineProps<{ currentContact?: Session }>()

const emit = defineEmits<{ (e: "sent"): void }>()

// 获取当前会话信息
const currentSession = computed(() => {
  return props.currentContact
})

interface FileInfo {
  path: string
  name: string
  size: number
  ext: string
}

const selectedFiles = ref<FileInfo[]>([])
const error = ref<string>("")
const isDragging = ref<boolean>(false)

const selectFiles = async () => {
  try {
    const result = await window.electronAPI.invoke('dialog:open-file', {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { 
          name: 'All Files', 
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg',
                      'mp4', 'avi', 'mov', 'webm', 'mkv', '3gp', 'wmv', 'flv',
                      'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma',
                      'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf',
                      'zip', 'rar', '7z', 'tar', 'gz'] 
        },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'] },
        { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'webm', 'mkv', '3gp', 'wmv', 'flv'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'rtf'] },
        { name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz'] }
      ]
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      const fileInfos = await window.electronAPI.invoke('file:get-multiple-info', result.filePaths)
      for (const fileInfo of fileInfos) {
        const isDuplicate = selectedFiles.value.some(
          (existingFile) => existingFile.path === fileInfo.path
        )
        if (!isDuplicate) {
          selectedFiles.value.push(fileInfo)
        }
      }
      
      error.value = ""
    }
  } catch (err: any) {
    error.value = err.message || "文件选择失败"
    console.error("文件选择失败:", err)
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isDragging.value = false
  
  try {
    const files = Array.from(event.dataTransfer?.files || [])
    console.log('拖拽文件数量:', files.length)
    
    if (files.length === 0) {
      console.warn('没有检测到拖拽的文件')
      return
    }
    
    // 在Electron中获取文件路径的正确方式
    const filePaths: string[] = []
    for (const file of files) {
      // 尝试多种方式获取文件路径
      const filePath = (file as any).path || (file as any).webkitRelativePath || file.name
      if (filePath && filePath !== file.name) {
        filePaths.push(filePath)
      } else {
        // 如果无法获取路径，尝试通过文件系统API
        console.warn('无法获取文件路径，文件名:', file.name)
        error.value = "拖拽文件失败：无法获取文件路径，请使用文件选择按钮"
        return
      }
    }
    
    console.log('获取到的文件路径:', filePaths)
    
    if (filePaths.length > 0) {
      const fileInfos = await window.electronAPI.invoke('file:get-multiple-info', filePaths)
      
      for (const fileInfo of fileInfos) {
        const isDuplicate = selectedFiles.value.some(
          (existingFile) => existingFile.path === fileInfo.path
        )
        if (!isDuplicate) {
          selectedFiles.value.push(fileInfo)
        }
      }
      
      error.value = "" // 清除错误信息
    }
  } catch (err: any) {
    error.value = err.message || "拖拽文件处理失败"
    console.error("拖拽文件处理失败:", err)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  event.stopPropagation()
  // 只有当离开整个拖拽区域时才重置状态
  if (event.relatedTarget === null || !(event.currentTarget as Element).contains(event.relatedTarget as Node)) {
    isDragging.value = false
  }
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
    
    let totalSize = 0
    for (const fileInfo of selectedFiles.value) {
      totalSize += fileInfo.size
    }
    if (totalSize > MAX_FILE_SIZE) {
      error.value = `文件总大小超过限制（100MB）`
      return
    }
    
    for (const fileInfo of selectedFiles.value) {
      console.log(`处理文件: ${fileInfo.name}, 大小: ${ioUtil.formatFileSize(fileInfo.size)}`)
      const mediaType = detectMediaTypeByExtension(fileInfo.ext)
      const payload = {
        filePath: fileInfo.path,
        fileName: fileInfo.name,
        fileSize: fileInfo.size,
        fileExt: fileInfo.ext,
        mediaType: mediaType,
        chat: {
          targetId: session.contactId,
          contactType: session.contactType,
          sessionId: session.sessionId
        }
      }

      console.log(`发送${mediaType}消息:`, {
        path: fileInfo.path,
        name: fileInfo.name,
        size: fileInfo.size,
        ext: fileInfo.ext,
        mediaType
      })
      window.electronAPI.send("media:send:start-by-filepath", payload)
    }

    console.log("所有文件发送完成")
    clearAllFiles()
    emit("sent")
  } catch (err: any) {
    error.value = err.message || "发送失败"
    console.error("文件发送失败:", err)
  }
}

const detectMediaTypeByExtension = (ext: string): string => {
  const extension = ext.toLowerCase().replace('.', '')
  
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'svg'].includes(extension)) {
    return 'image'
  }
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp'].includes(extension)) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(extension)) {
    return 'voice'
  }
  return 'file'
}
</script>

<template>
  <div 
    class="media-send-box"
    :class="{ 'is-dragging': isDragging }"
    @drop="handleDrop"
    @dragover="handleDragOver"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
  >
    <div class="file-select-section">
      <button class="select-file-btn" @click="selectFiles">
        <i class="iconfont icon-plus"></i>
        {{ isDragging ? '释放文件到此处' : '选择文件或拖拽到此处' }}
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
            <div class="file-size">{{ ioUtil.formatFileSize(file.size) }}</div>
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
  transition: all 0.3s ease;
}

.media-send-box.is-dragging {
  border-color: #007AFF;
  background: rgba(0, 122, 255, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 122, 255, 0.3);
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
