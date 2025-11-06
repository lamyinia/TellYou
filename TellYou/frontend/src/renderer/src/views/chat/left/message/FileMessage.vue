<script setup lang="ts">
/* eslint-disable */

import type { ChatMessage } from "@renderer/status/message/class"
import { useUserStore } from "@main/electron-store/persist/user-store"
import { computed, ref, onMounted, onUnmounted } from "vue"
import Avatar from "@renderer/components/Avatar.vue"
import NickName from "@renderer/components/NickName.vue"
import {
  mediaDownloadManager,
  type DownloadState,
} from "@renderer/utils/media-download-manager"
import { Download, FileText, FolderOpen } from "lucide-vue-next"

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = "thumbedAvatarUrl"

const downloadState = ref<DownloadState>({ status: "idle" })
const fileUrl = ref("")
const isDownloading = ref(false)
const previewImageUrl = ref("")

let unsubscribe: (() => void) | null = null

const fileInfo = computed(() => {
  const content = props.message.content
  try {
    console.log("file-message:parsed", content)
    const parsed = JSON.parse(content)
    if (parsed.originalLocalPath) {
      fileUrl.value = parsed.originalLocalPath
      console.log('fileUrl.value', fileUrl.value)
    }
    return {
      fileName: parsed.fileName || "未知文件",
      fileSize: parsed.fileSize || 0,
      fileSuffix: parsed.fileSuffix || "",
    }
  } catch {
    return {
      fileName: "未知文件",
      fileSize: 0,
      fileSuffix: "",
    }
  }
})
// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// 订阅下载状态
const subscribeToDownload = () => {
  unsubscribe = mediaDownloadManager.subscribe(props.message.id, (state) => {
    downloadState.value = state
    if (state.status === "completed" && state.url) {
      fileUrl.value = state.url
    }
  })
}

// 下载文件
const downloadFile = async () => {
  if (isDownloading.value) return

  try {
    isDownloading.value = true
    const result = await mediaDownloadManager.requestMedia(props.message.id, "original", "file")
    if (result) {
      fileUrl.value = result
    }
  } catch (error) {
    console.error("文件下载失败:", error)
  } finally {
    isDownloading.value = false
  }
}
const showInFolder = async () => {
  if (!fileUrl.value) {
    await downloadFile()
  }
  if (fileUrl.value) {
    try {
      const result = await window.electronAPI.invoke("file:show-in-folder", fileUrl.value)
      if (!result.success) {
        console.error("显示文件位置失败:", result.error)
      }
    } catch (error) {
      console.error("显示文件位置失败:", error)
    }
  }
}

// 获取文件预览图
const loadPreviewImage = async () => {
  try {
    const result = await window.electronAPI.invoke("file:get-preview-image", fileInfo.value.fileSuffix)
    if (result && result.success) {
      // 使用浏览器兼容的方式处理二进制数据
      const uint8Array = new Uint8Array(result.data)
      let binaryString = ""
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
      }
      const base64Data = btoa(binaryString)
      previewImageUrl.value = `data:${result.mimeType};base64,${base64Data}`
    }
  } catch (error) {
    console.error("获取文件预览图失败:", error)
  }
}

onMounted(() => {
  subscribeToDownload()
  loadPreviewImage()
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :target-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="left"
      />
      <div class="content left">
        <NickName
          :target-id="props.message.senderId"
          :contact-type="1"
          :nickname-version="props.message.nicknameVersion"
          :placeholder="props.message.senderName"
          side="left"
        />
        <div class="file-message">
          <div class="file-preview">
            <img
              v-if="previewImageUrl"
              :src="previewImageUrl"
              class="file-preview-image"
              alt="文件预览"
            />
            <FileText v-else :size="48" class="file-icon" />
          </div>
          <div class="file-info">
            <div class="file-name" :title="fileInfo.fileName">
              {{ fileInfo.fileName }}
            </div>
            <div class="file-details">
              <span class="file-size">{{
                formatFileSize(fileInfo.fileSize)
              }}</span>
              <span class="file-type">{{
                fileInfo.fileSuffix.toUpperCase()
              }}</span>
            </div>
            <div class="file-actions">
              <button
                class="action-btn download-btn"
                :disabled="
                  isDownloading || downloadState.status === 'downloading'
                "
                :title="fileUrl ? '重新下载' : '下载文件'"
                @click="downloadFile"
              >
                <Download :size="16" />
                <span v-if="downloadState.status === 'downloading'">
                  {{ downloadState.progress?.percentage || 0 }}%
                </span>
                <span v-else>下载</span>
              </button>
              <button
                class="action-btn folder-btn"
                :disabled="!fileUrl"
                title="显示文件位置"
                @click="showInFolder"
              >
                <FolderOpen :size="16" />
                位置
              </button>
            </div>
          </div>
        </div>
        <!-- 下载进度条 -->
        <div
          v-if="
            downloadState.status === 'downloading' && downloadState.progress
          "
          class="download-progress"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${downloadState.progress.percentage}%` }"
            ></div>
          </div>
          <div class="progress-info">
            <span>{{ downloadState.progress.percentage }}%</span>
            <span v-if="downloadState.progress.speed">
              {{ Math.round(downloadState.progress.speed / 1024) }}KB/s
            </span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="content right">
        <NickName
          :target-id="props.message.senderId"
          :contact-type="1"
          :nickname-version="props.message.nicknameVersion"
          :placeholder="props.message.senderName"
          side="right"
        />
        <div class="file-message">
          <div class="file-preview">
            <img
              v-if="previewImageUrl"
              :src="previewImageUrl"
              class="file-preview-image"
              alt="文件预览"
            />
            <FileText v-else :size="48" class="file-icon" />
          </div>
          <div class="file-info">
            <div class="file-name" :title="fileInfo.fileName">
              {{ fileInfo.fileName }}
            </div>
            <div class="file-details">
              <span class="file-size">{{
                formatFileSize(fileInfo.fileSize)
              }}</span>
              <span class="file-type">{{
                fileInfo.fileSuffix.toUpperCase()
              }}</span>
            </div>
            <div class="file-actions">
              <button
                class="action-btn download-btn"
                :disabled="
                  isDownloading || downloadState.status === 'downloading'
                "
                :title="fileUrl ? '重新下载' : '下载文件'"
                @click="downloadFile"
              >
                <Download :size="16" />
                <span v-if="downloadState.status === 'downloading'">
                  {{ downloadState.progress?.percentage || 0 }}%
                </span>
                <span v-else>下载</span>
              </button>
              <button
                class="action-btn folder-btn"
                :disabled="!fileUrl"
                title="显示文件位置"
                @click="showInFolder"
              >
                <FolderOpen :size="16" />
                位置
              </button>
            </div>
          </div>
        </div>
        <!-- 下载进度条 -->
        <div
          v-if="
            downloadState.status === 'downloading' && downloadState.progress
          "
          class="download-progress"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${downloadState.progress.percentage}%` }"
            ></div>
          </div>
          <div class="progress-info">
            <span>{{ downloadState.progress.percentage }}%</span>
            <span v-if="downloadState.progress.speed">
              {{ Math.round(downloadState.progress.speed / 1024) }}KB/s
            </span>
          </div>
        </div>
      </div>
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :target-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="right"
      />
    </template>
  </div>
</template>

<style scoped>
@import "@renderer/styles/message-common.css";

.file-message {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  max-width: 400px;
}

.msg-row.other .file-message {
  background: #e3f2fd;
  border-color: #bbdefb;
}

.file-preview {
  flex-shrink: 0;
}

.preview-image {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
}

.file-preview-image {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 8px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-details {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666;
}

.file-size {
  color: #666;
}

.file-type {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  color: #495057;
}

.file-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  background: #fff;
  color: #495057;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.download-btn {
  color: #0d6efd;
  border-color: #0d6efd;
}

.download-btn:hover:not(:disabled) {
  background: #e7f1ff;
}

.preview-btn {
  color: #198754;
  border-color: #198754;
}

.preview-btn:hover:not(:disabled) {
  background: #e8f5e8;
}

.open-btn {
  color: #fd7e14;
  border-color: #fd7e14;
}

.open-btn:hover:not(:disabled) {
  background: #fff3e0;
}

.folder-btn {
  color: #6f42c1;
  border-color: #6f42c1;
}

.folder-btn:hover:not(:disabled) {
  background: #f3e8ff;
}

.download-progress {
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: #0d6efd;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-message {
    max-width: 100%;
    flex-direction: column;
  }

  .file-actions {
    justify-content: center;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
