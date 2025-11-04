<script setup lang="ts">
/* eslint-disable */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ChatMessage } from '@renderer/status/message/class'
import { mediaUploadManager, type UploadInfo } from '@renderer/utils/media-upload-manager'
import { useUserStore } from '@main/electron-store/persist/user-store'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'

const props = defineProps<{
  message: ChatMessage
}>()

const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = "thumbedAvatarUrl"

const uploadInfo = ref<UploadInfo | null>(null)

// 计算进度条宽度
const progressWidth = computed(() => {
  return uploadInfo.value ? `${uploadInfo.value.progress}%` : '0%'
})

// 计算显示的媒体类型
const mediaTypeText = computed(() => {
  switch (uploadInfo.value?.mediaType) {
    case 'image': return '图片'
    case 'video': return '视频'
    case 'voice': return '语音'
    case 'file': return '文件'
    default: return '文件'
  }
})

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 上传状态监听器
const handleUploadStatusChange = (messageId: number, info: UploadInfo | null) => {
  if (messageId === props.message.id) {
    uploadInfo.value = info
  }
}

// 取消上传
const cancelUpload = () => {
  mediaUploadManager.cancelUpload(props.message.id)
}

onMounted(() => {
  // 获取初始上传信息
  uploadInfo.value = mediaUploadManager.getUploadInfo(props.message.id)
  
  // 添加状态监听器
  mediaUploadManager.addListener(handleUploadStatusChange)
})

onUnmounted(() => {
  // 移除状态监听器
  mediaUploadManager.removeListener(handleUploadStatusChange)
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
        <div class="uploading-message">
          <div class="message-header">
            <div class="media-icon">
              <i class="iconfont" :class="{
                'icon-image': uploadInfo?.mediaType === 'image',
                'icon-video': uploadInfo?.mediaType === 'video', 
                'icon-voice': uploadInfo?.mediaType === 'voice',
                'icon-file': uploadInfo?.mediaType === 'file'
              }"></i>
            </div>
            <div class="message-info">
              <div class="media-type">{{ mediaTypeText }}上传中...</div>
              <div class="progress-info">
                <span class="progress-text">{{ Math.round(uploadInfo?.progress || 0) }}%</span>
              </div>
            </div>
            <div class="upload-actions">
              <button class="cancel-btn" @click="cancelUpload" title="取消上传">
                <i class="iconfont icon-close"></i>
              </button>
            </div>
          </div>
          
          <!-- 进度条 -->
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressWidth }"></div>
          </div>
          
          <!-- 上传详情 -->
          <div class="upload-details" v-if="uploadInfo">
            <div class="upload-time">
              上传开始于 {{ new Date(uploadInfo.startTime).toLocaleTimeString() }}
            </div>
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
        <div class="uploading-message">
          <div class="message-header">
            <div class="media-icon">
              <i class="iconfont" :class="{
                'icon-image': uploadInfo?.mediaType === 'image',
                'icon-video': uploadInfo?.mediaType === 'video', 
                'icon-voice': uploadInfo?.mediaType === 'voice',
                'icon-file': uploadInfo?.mediaType === 'file'
              }"></i>
            </div>
            <div class="message-info">
              <div class="media-type">{{ mediaTypeText }}上传中...</div>
              <div class="progress-info">
                <span class="progress-text">{{ Math.round(uploadInfo?.progress || 0) }}%</span>
              </div>
            </div>
            <div class="upload-actions">
              <button class="cancel-btn" @click="cancelUpload" title="取消上传">
                <i class="iconfont icon-close"></i>
              </button>
            </div>
          </div>
          
          <!-- 进度条 -->
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progressWidth }"></div>
          </div>
          
          <!-- 上传详情 -->
          <div class="upload-details" v-if="uploadInfo">
            <div class="upload-time">
              上传开始于 {{ new Date(uploadInfo.startTime).toLocaleTimeString() }}
            </div>
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
.uploading-message {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  max-width: 300px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.media-icon {
  width: 32px;
  height: 32px;
  background: #007bff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.message-info {
  flex: 1;
}

.media-type {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.progress-text {
  font-weight: 500;
  color: #007bff;
}

.upload-actions {
  display: flex;
  align-items: center;
}

.cancel-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: #ff4757;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background: #ff3742;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.upload-details {
  font-size: 11px;
  color: #999;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-time {
  font-style: italic;
}

/* 不同媒体类型的图标颜色 */
.media-icon .icon-image {
  color: #28a745;
}

.media-icon .icon-video {
  color: #dc3545;
}

.media-icon .icon-voice {
  color: #ffc107;
}

.media-icon .icon-file {
  color: #6c757d;
}

/* 动画效果 */
.progress-fill {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}
</style>
