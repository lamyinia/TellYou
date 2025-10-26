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
@import '@renderer/styles/message-common.css';
</style>
