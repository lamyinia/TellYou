<script setup lang="ts">
/* eslint-disable */

import type { ChatMessage } from "@renderer/status/message/class";
import { useUserStore } from "@main/electron-store/persist/user-store";
import { computed } from "vue";
import Avatar from "@renderer/components/Avatar.vue";
import NickName from "@renderer/components/NickName.vue";

const props = defineProps<{ message: ChatMessage }>();
const userStore = useUserStore();
const isSelf = computed(() => props.message.senderId === userStore.myId);

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
        <div class="bubble left">{{ props.message.content }}</div>
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
        <div class="bubble right">{{ props.message.content }}</div>
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
</style>
