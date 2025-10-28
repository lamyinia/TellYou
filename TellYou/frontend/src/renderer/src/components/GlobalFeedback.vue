<script setup lang="ts">
/* eslint-disable */

import { computed } from "vue"
import feedbackUtil, { FeedbackType } from "@renderer/utils/feedback-util"

// 获取所有消息
const messages = computed(() => feedbackUtil.allMessages.value)

// 获取消息图标
const getMessageIcon = (type: FeedbackType): string => {
  switch (type) {
    case FeedbackType.SUCCESS:
      return "mdi-check-circle";
    case FeedbackType.ERROR:
      return "mdi-alert-circle";
    case FeedbackType.WARNING:
      return "mdi-alert";
    case FeedbackType.INFO:
      return "mdi-information";
    default:
      return "mdi-information";
  }
};

// 获取消息颜色
const getMessageColor = (type: FeedbackType): string => {
  switch (type) {
    case FeedbackType.SUCCESS:
      return "success";
    case FeedbackType.ERROR:
      return "error";
    case FeedbackType.WARNING:
      return "warning";
    case FeedbackType.INFO:
      return "info";
    default:
      return "info";
  }
};

// 手动关闭消息
const closeMessage = (id: string): void => {
  feedbackUtil.remove(id);
};
</script>

<template>
  <!-- 全局反馈消息容器 -->
  <div class="global-feedback-container">
    <transition-group name="feedback" tag="div" class="feedback-list">
      <div
        v-for="message in messages"
        :key="message.id"
        class="feedback-card"
        :class="`feedback-${message.type}`"
      >
        <div class="feedback-content">
          <div class="feedback-header">
            <v-icon
              :icon="getMessageIcon(message.type)"
              size="20"
              class="feedback-icon"
            />
            <span class="feedback-title">{{ message.title }}</span>
            <v-btn
              icon
              size="small"
              variant="text"
              class="feedback-close"
              @click="closeMessage(message.id)"
            >
              <v-icon icon="mdi-close" size="16" />
            </v-btn>
          </div>
          <div v-if="message.message" class="feedback-message">
            {{ message.message }}
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.global-feedback-container {
  position: relative;
  z-index: 9999;
  pointer-events: auto;
  display: flex;
  justify-content: center;
  width: 100%;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.feedback-card {
  position: relative;
  pointer-events: auto;
  max-width: 400px;
  min-width: 300px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.feedback-content {
  width: 100%;
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.feedback-icon {
  flex-shrink: 0;
}

.feedback-title {
  flex: 1;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.2;
}

.feedback-close {
  flex-shrink: 0;
  opacity: 0.7;
}

.feedback-close:hover {
  opacity: 1;
}

.feedback-message {
  font-size: 13px;
  line-height: 1.4;
  opacity: 0.9;
  margin-left: 28px;
}

/* 不同类型的样式微调 */
.feedback-success {
  background: rgba(76, 175, 80, 0.95);
  color: white;
  border-color: rgba(76, 175, 80, 0.3);
}

.feedback-error {
  background: rgba(244, 67, 54, 0.95);
  color: white;
  border-color: rgba(244, 67, 54, 0.3);
}

.feedback-warning {
  background: rgba(255, 152, 0, 0.95);
  color: white;
  border-color: rgba(255, 152, 0, 0.3);
}

.feedback-info {
  background: rgba(33, 150, 243, 0.95);
  color: white;
  border-color: rgba(33, 150, 243, 0.3);
}

/* 进入和退出动画 */
.feedback-enter-active,
.feedback-leave-active {
  transition: all 0.3s ease;
}

.feedback-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.feedback-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.feedback-move {
  transition: transform 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .feedback-card {
    max-width: 90vw;
    min-width: auto;
    margin: 0 8px;
  }
}

/* 确保在所有内容之上 */
.global-feedback-container {
  z-index: 10000;
}
</style>
