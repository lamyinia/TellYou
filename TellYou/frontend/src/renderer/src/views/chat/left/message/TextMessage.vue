<script setup lang="ts">
import type { ChatMessage } from '@renderer/status/message/class'
import { useUserStore } from '@main/electron-store/persist/user-store'
import { computed } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = 'thumbedAvatarUrl'
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :target-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="left"
      />
      <div class="content left">
        <NickName :user-id="props.message.senderId" :version="props.message.nicknameVersion" :name="props.message.senderName" side="left" />
        <div class="bubble left">{{ props.message.content }}</div>
      </div>
    </template>
    <template v-else>
      <div class="content right">
        <NickName :user-id="props.message.senderId" :version="props.message.nicknameVersion" :name="props.message.senderName" side="right" />
        <div class="bubble right">{{ props.message.content }}</div>
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
.msg-row {
  display: flex;
  align-items: flex-start;
}
.msg-row.other {
  justify-content: flex-end;
}
.msg-row { gap: 8px; }
.content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  width: auto;
}
.content.left { align-items: flex-start; }
.content.right { align-items: flex-end; }
.bubble {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 100%;
  font-size: 0.95rem;
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
  box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.18);
}
.bubble.left {
  background: linear-gradient(135deg, rgba(79,139,255,0.28) 0%, rgba(122,167,255,0.24) 100%);
  color: #f3f7ff;
  border: 1px solid rgba(122,167,255,0.28);
  border-top-left-radius: 4px;
  margin-right: 8px;
}
.bubble.right {
  background: rgba(118, 127, 255, 0.18);
  color: #e6ecff;
  border: 1px solid rgba(118,127,255,0.22);
  border-top-right-radius: 4px;
  margin-left: 8px;
}
</style>
