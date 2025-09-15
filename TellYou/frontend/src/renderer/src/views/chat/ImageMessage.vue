<script setup lang="ts">
import type { ChatMessage } from '@renderer/status/message/message-class'
import { useUserStore } from '@main/electron-store/persist/user-store'
import { computed } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar :url="props.message.senderAvatar" :name="props.message.senderName" side="left" />
      <img class="image" :src="props.message.content" alt="image" />
    </template>
    <template v-else>
      <img class="image" :src="props.message.content" alt="image" />
      <Avatar :url="props.message.senderAvatar" :name="props.message.senderName" side="right" />
    </template>
  </div>
</template>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-end;
}
.msg-row.other { justify-content: flex-end; }
.image {
  max-width: 240px;
  max-height: 240px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(31, 38, 135, 0.18);
}
</style>
