<script setup lang="ts">
/* eslint-disable */

import type { ChatMessage } from "@renderer/status/message/class"
import { computed } from "vue"

const props = defineProps<{ message: ChatMessage }>()

/**
 * 系统消息类型枚举
 * 51: 入群通知
 * 52: 退群通知
 * 53: 权限赋予
 * 54: 权限撤销
 * 55: 群公告更改
 */
interface SystemMessageType {
  type: number
  label: string
  icon: string
  color: string
}

const systemMessageTypes: SystemMessageType[] = [
  { type: 51, label: "入群", icon: "➕", color: "#4caf50" },
  { type: 52, label: "退群", icon: "➖", color: "#ff9800" },
  { type: 53, label: "权限赋予", icon: "⭐", color: "#2196f3" },
  { type: 54, label: "权限撤销", icon: "⬇️", color: "#f44336" },
  { type: 55, label: "群公告更改", icon: "📢", color: "#9c27b0" },
]

/**
 * 解析系统消息内容
 * 格式: "昵称1,昵称2,...群聊系统通知入群"
 * 或者: "昵称1,昵称2,...群聊系统通知退群"
 */
const parseSystemMessage = computed(() => {
  const content = props.message.content || ""
  
  // 查找消息类型（从后往前匹配，因为描述在最后）
  let matchedType = systemMessageTypes[0] // 默认入群通知
  for (const type of systemMessageTypes) {
    if (content.includes(type.label)) {
      matchedType = type
      break
    }
  }

  // 解析用户昵称列表
  // 格式: "昵称1,昵称2,...群聊系统通知入群"
  // 需要找到"群聊系统通知"关键字，前面的部分是昵称列表
  let usernames: string[] = []
  let actionText = matchedType.label
  
  const systemNotifyKeyword = "群聊系统通知"
  const keywordIndex = content.indexOf(systemNotifyKeyword)
  
  if (keywordIndex > 0) {
    // 提取"群聊系统通知"之前的部分作为昵称列表
    const namesPart = content.substring(0, keywordIndex).trim()
    usernames = namesPart.split(",").map(name => name.trim()).filter(Boolean)
    // 提取"群聊系统通知"之后的部分作为动作描述
    const afterKeyword = content.substring(keywordIndex + systemNotifyKeyword.length).trim()
    if (afterKeyword) {
      actionText = afterKeyword
    }
  } else {
    // 如果没有"群聊系统通知"关键字，尝试直接匹配类型标签
    // 格式可能是: "昵称1,昵称2,...入群"
    for (const type of systemMessageTypes) {
      const typeIndex = content.indexOf(type.label)
      if (typeIndex > 0) {
        const namesPart = content.substring(0, typeIndex).trim()
        usernames = namesPart.split(",").map(name => name.trim()).filter(Boolean)
        actionText = type.label
        break
      }
    }
  }

  // 如果还是没解析到昵称，整条消息作为描述
  if (usernames.length === 0) {
    actionText = content || matchedType.label
  }

  return {
    usernames,
    actionText,
    typeInfo: matchedType,
  }
})

const displayText = computed(() => {
  const { usernames, actionText, typeInfo } = parseSystemMessage.value
  
  if (usernames.length > 0) {
    // 格式化用户列表：超过50个人才显示"用户1、用户2等N人"
    let userText = ""
    if (usernames.length <= 50) {
      userText = usernames.join("、")
    } else {
      userText = `${usernames.slice(0, 2).join("、")}等${usernames.length}人`
    }
    return `${userText}${actionText}`
  }
  
  return actionText || "系统通知"
})
</script>

<template>
  <div class="system-message-container">
    <div class="system-message">
      <span class="system-icon" :style="{ color: parseSystemMessage.typeInfo.color }">
        {{ parseSystemMessage.typeInfo.icon }}
      </span>
      <span class="system-text">{{ displayText }}</span>
    </div>
  </div>
</template>

<style scoped>
.system-message-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  margin: 4px 0;
}

.system-message {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-width: 80%;
  text-align: center;
}

.system-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.system-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .system-message {
    max-width: 90%;
    padding: 5px 12px;
  }
  
  .system-text {
    font-size: 11px;
  }
}
</style>
