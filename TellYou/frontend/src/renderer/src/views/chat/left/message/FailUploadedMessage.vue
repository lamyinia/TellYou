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
  error?: string
}>()

const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = "thumbedAvatarUrl"

const uploadInfo = ref<UploadInfo | null>(null)
const mediaTypeText = computed(() => {
  switch (uploadInfo.value?.mediaType || props.message.messageType) {
    case 'image': return '图片'
    case 'video': return '视频'
    case 'voice': return '语音'
    case 'file': return '文件'
    default: return '文件'
  }
})

const errorMessage = computed(() => {
  return props.error || uploadInfo.value?.error || '上传失败，请重试'
})



const retryUpload = () => {
  mediaUploadManager.retryUpload(props.message.id)
}

const deleteMessage = () => {
  mediaUploadManager.cancelUpload(props.message.id)
}

onMounted(() => {
  uploadInfo.value = mediaUploadManager.getUploadInfo(props.message.id)
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
        <div class="fail-uploaded-message">
          <div class="message-header">
            <div class="media-icon error">
              <i class="iconfont" :class="{
                'icon-image': uploadInfo?.mediaType === 'image' || message.messageType === 'image',
                'icon-video': uploadInfo?.mediaType === 'video' || message.messageType === 'video',
                'icon-voice': uploadInfo?.mediaType === 'voice' || message.messageType === 'voice',
                'icon-file': uploadInfo?.mediaType === 'file' || message.messageType === 'file'
              }"></i>
            </div>
            <div class="message-info">
              <div class="media-type">{{ mediaTypeText }}上传失败</div>
              <div class="error-info">
                <i class="iconfont icon-warning"></i>
                <span class="error-text">{{ errorMessage }}</span>
              </div>
            </div>
          </div>

          <!-- 错误详情 -->
          <div class="error-details">
            <div class="error-time">
              失败时间: {{ message.timestamp.toLocaleString() }}
            </div>
            <div class="error-tip">
              点击重试按钮重新上传，或删除此消息
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
        <div class="fail-uploaded-message">
          <div class="message-header">
            <div class="media-icon error">
              <i class="iconfont" :class="{
                'icon-image': uploadInfo?.mediaType === 'image' || message.messageType === 'image',
                'icon-video': uploadInfo?.mediaType === 'video' || message.messageType === 'video',
                'icon-voice': uploadInfo?.mediaType === 'voice' || message.messageType === 'voice',
                'icon-file': uploadInfo?.mediaType === 'file' || message.messageType === 'file'
              }"></i>
            </div>
            <div class="message-info">
              <div class="media-type">{{ mediaTypeText }}上传失败</div>
              <div class="error-info">
                <i class="iconfont icon-warning"></i>
                <span class="error-text">{{ errorMessage }}</span>
              </div>
            </div>
            <div class="upload-actions">
              <button class="retry-btn" @click="retryUpload" title="重试上传">
                <i class="iconfont icon-refresh"></i>
              </button>
              <button class="delete-btn" @click="deleteMessage" title="删除消息">
                <i class="iconfont icon-delete"></i>
              </button>
            </div>
          </div>

          <!-- 错误详情 -->
          <div class="error-details">
            <div class="error-time">
              失败时间: {{ message.timestamp.toLocaleString() }}
            </div>
            <div class="error-tip">
              点击重试按钮重新上传，或删除此消息
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
.fail-uploaded-message {
  background: #fff5f5;
  border: 1px solid #fed7d7;
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
  background: #e53e3e;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.media-icon.error {
  background: #e53e3e;
}

.message-info {
  flex: 1;
}

.media-type {
  font-size: 14px;
  font-weight: 500;
  color: #e53e3e;
  margin-bottom: 4px;
}

.error-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #c53030;
}

.error-info .icon-warning {
  font-size: 12px;
}

.error-text {
  flex: 1;
  word-break: break-word;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.retry-btn,
.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.retry-btn {
  background: #38a169;
}

.retry-btn:hover {
  background: #2f855a;
  transform: scale(1.05);
}

.delete-btn {
  background: #e53e3e;
}

.delete-btn:hover {
  background: #c53030;
  transform: scale(1.05);
}

.error-details {
  font-size: 11px;
  color: #a0aec0;
  border-top: 1px solid #fed7d7;
  padding-top: 8px;
  margin-top: 8px;
}

.error-time {
  margin-bottom: 4px;
  font-weight: 500;
}

.error-tip {
  font-style: italic;
  color: #718096;
}

/* 不同媒体类型的图标样式 */
.media-icon .icon-image,
.media-icon .icon-video,
.media-icon .icon-voice,
.media-icon .icon-file {
  color: white;
}

/* 重试按钮旋转动画 */
.retry-btn:active .icon-refresh {
  animation: spin 0.5s linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 错误状态的脉冲动画 */
.fail-uploaded-message {
  animation: errorPulse 3s ease-in-out infinite;
}

@keyframes errorPulse {
  0%, 100% {
    border-color: #fed7d7;
    box-shadow: 0 0 0 0 rgba(229, 62, 62, 0.1);
  }
  50% {
    border-color: #fc8181;
    box-shadow: 0 0 0 4px rgba(229, 62, 62, 0.1);
  }
}
</style>
