<script setup lang="ts">
/* eslint-disable */

import { ref, computed, watch, onMounted } from 'vue'
import type { ChatMessage } from '@renderer/status/message/class'
import { mediaUploadManager, type UploadInfo } from '@renderer/utils/media-upload-manager'
import { useUserStore } from '@main/electron-store/persist/user-store'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'

const props = defineProps<{ message: ChatMessage }>()

const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)

const uploadInfo = ref<UploadInfo | null>(null)

watch(
  () => mediaUploadManager.uploadingMessages.get(Number(props.message.id)),
  (newInfo) => {
    console.log('Watch检测到上传信息变化:', {
      messageId: props.message.id,
      newInfo
    })
    uploadInfo.value = newInfo || null
  },
  { immediate: true }
)

const progressWidth = computed(() => {
  const progress = uploadInfo.value?.progress || 0
  const width = `${progress}%`

  console.log('计算进度条宽度:', {
    uploadInfo: uploadInfo.value,
    progress,
    width
  })
  return width
})
const mediaTypeText = computed(() => {
  switch (uploadInfo.value?.mediaType) {
    case 'image': return '图片'
    case 'video': return '视频'
    case 'voice': return '语音'
    case 'file': return '文件'
    default: return '文件'
  }
})
const cancelUpload = () => {
  mediaUploadManager.cancelUpload(Number(props.message.id))
}

onMounted(() => {
  console.log('UploadingMessage组件挂载:', {
    messageId: props.message.id,
    senderId: props.message.senderId,
    isSelf: isSelf.value
  })
  uploadInfo.value = mediaUploadManager.uploadingMessages.get(Number(props.message.id)) || null
})
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar
        :version="props.message.avatarVersion"
        :target-id="props.message.senderId"
        :contact-type="1"
        strategy="thumbedAvatarUrl"
        shape="circle"
        :fallback-text="props.message.senderName"
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
        <div class="bubble left uploading-message">
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
        <div class="bubble right uploading-message">
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
        :target-id="props.message.senderId"
        :contact-type="1"
        strategy="thumbedAvatarUrl"
        shape="circle"
        :fallback-text="props.message.senderName"
        side="right"
      />
    </template>
  </div>
</template>

<style scoped>
@import "@renderer/styles/message-common.css";

.uploading-message {
  padding: 16px;
  background: linear-gradient(135deg, rgba(79, 139, 255, 0.9) 0%, rgba(122, 167, 255, 0.8) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(31, 38, 135, 0.25);
  min-width: 280px;
  backdrop-filter: blur(15px);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.media-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.message-info {
  flex: 1;
}

.media-type {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.progress-text {
  font-weight: 600;
  color: #ffffff;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.upload-actions {
  display: flex;
  align-items: center;
}

.cancel-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: linear-gradient(135deg, #ff4757 0%, #ff3742 100%);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(255, 71, 87, 0.3);
}

.cancel-btn:hover {
  background: linear-gradient(135deg, #ff3742 0%, #ff2d3a 100%);
  transform: scale(1.05);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(224, 224, 224, 0.6);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff 0%, #0056b3 50%, #007bff 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 123, 255, 0.4);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: 200px 0; }
}

.progress-fill::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: slide 1.5s infinite;
}

@keyframes slide {
  0% { left: -100%; }
  100% { left: 100%; }
}

.upload-details {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-time {
  font-style: italic;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
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

/* 根据媒体类型调整图标背景 */
.uploading-message:has(.icon-image) .media-icon {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
}

.uploading-message:has(.icon-video) .media-icon {
  background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
}

.uploading-message:has(.icon-voice) .media-icon {
  background: linear-gradient(135deg, #ffc107 0%, #f39c12 100%);
}

.uploading-message:has(.icon-file) .media-icon {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
}
</style>
