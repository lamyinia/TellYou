<script setup lang="ts">
import type { ChatMessage } from '@renderer/status/message/class'
import { useUserStore } from '@main/electron-store/persist/user-store'
import { computed } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = 'thumbedAvatarUrl'
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :user-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="left"
      />
      <div class="bubble left">{{ props.message.content }}</div>
    </template>
    <template v-else>
      <div class="bubble right">{{ props.message.content }}</div>
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :user-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="right"
      />
    </template>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-end;
}
.msg-row.other {
  justify-content: flex-end;
}
.bubble {
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 60%;
  font-size: 0.95rem;
  word-break: break-all;
  box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.18);
}
.bubble.left {
  background: rgba(255, 255, 255, 0.12);
  color: #e9f1f4;
  border-top-left-radius: 4px;
  margin-right: 8px;
}
.bubble.right {
  background: linear-gradient(135deg, #3949ab 60%, #5c6bc0 100%);
  color: #fff;
  border-top-right-radius: 4px;
  margin-left: 8px;
}
</style>
