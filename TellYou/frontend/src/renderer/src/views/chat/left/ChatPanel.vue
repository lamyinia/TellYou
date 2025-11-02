<script setup lang="ts">
/* eslint-disable */

import { computed, nextTick, onMounted, ref, watch } from "vue"
import type { Session } from "@shared/types/session"
import { useMessageStore } from "@renderer/status/message/store"
import TextMessage from "@renderer/views/chat/left/message/TextMessage.vue"
import ImageMessage from "@renderer/views/chat/left/message/ImageMessage.vue"
import VideoMessage from "@renderer/views/chat/left/message/VideoMessage.vue"
import VoiceMessage from "@renderer/views/chat/left/message/VoiceMessage.vue"
import FileMessage from "@renderer/views/chat/left/message/FileMessage.vue"
import SystemMessage from "@renderer/views/chat/left/message/SystemMessage.vue"
import MessageSendBox from "@renderer/views/chat/left/send/MessageSendBox.vue"
import MemberDrawer from "@renderer/views/chat/group/MemberDrawer.vue"
import InvitableDrawer from "@renderer/views/chat/group/InvitableDrawer.vue"
import membersIcon from "@renderer/assets/group/members.svg"
import inviteFriendIcon from "@renderer/assets/group/invite-friend.svg"

const props = defineProps<{ currentContact: Session | null }>()
const contactName = computed(() => props.currentContact?.contactName || "")
const messageStore = useMessageStore()
const currentSessionId = computed(() => props.currentContact?.sessionId || "")
const listRef = ref<HTMLElement | null>(null)
const isFirstLoad = ref(true)
const preloadThreshold = 80
const memberDrawerOpen = ref(false)
const inviteDrawerOpen = ref(false)

const isGroupChat = computed(() => props.currentContact?.contactType === 2)

const toggleMemberDrawer = (): void => {
  memberDrawerOpen.value = !memberDrawerOpen.value
}

const toggleInviteDrawer = (): void => {
  inviteDrawerOpen.value = !inviteDrawerOpen.value
}

// 简单防抖工具，避免高频滚动触发加载
const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 100,): ((...args: Parameters<T>) => void) => {
  let timer: number | undefined
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}

const messages = computed(() => {
  const id = currentSessionId.value
  if (!id) return []
  const result = messageStore.getCurrentSessionMessages(String(id))
  console.log(
    `ChatPanel computed messages for session ${id}:`,
    result.length,
    "messages",
  )
  return result
})
const displayedMessages = computed(() => [...messages.value].reverse())

watch(
  currentSessionId,
  (id) => {
    if (id) {
      isFirstLoad.value = true
      messageStore.setCurrentSession(String(id))
    }
  },
  { immediate: true },
)
watch(
  messages,
  async (val) => {
    if (!listRef.value) return
    if (isFirstLoad.value && val.length > 0) {
      await scrollToBottom()
      isFirstLoad.value = false
    }
  },
  { deep: true },
)

onMounted(async () => {
  await scrollToBottom()
})

const goToBottom = async (): Promise<void> => {
  await scrollToBottom()
}
const scrollToBottom = async (): Promise<void> => {
  if (!listRef.value) return
  await nextTick()
  listRef.value.scrollTop = listRef.value.scrollHeight
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => {
      if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
      resolve()
    })
  )
}

const handleScroll = async (): Promise<void> => {
  const el = listRef.value
  const sessionId = currentSessionId.value
  if (!el || !sessionId) return
  const { scrollTop, scrollHeight, clientHeight } = el

  if (scrollTop <= preloadThreshold) {
    const prevScrollHeight = scrollHeight
    const prevTop = scrollTop
    console.log("滚动到顶部时加载旧消息")
    const loaded = await messageStore.loadOlderMessages(String(sessionId))
    if (loaded) {
      await nextTick()
      const diff = listRef.value!.scrollHeight - prevScrollHeight
      listRef.value!.scrollTop = prevTop + diff
    }
  }
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  if (distanceToBottom <= preloadThreshold) {
    console.log("滚动到底部时加载更新的消息")
    await messageStore.loadNewerMessages(sessionId)
  }
}

// 防抖后的滚动处理函数
const onScroll = debounce(() => {
  void handleScroll()
}, 100)
</script>

<template>
  <div class="star-panel-bg">
    <div class="star-header" :class="{ 'group-chat': isGroupChat }">
      <span v-if="isGroupChat" class="icon-buttons">
        <button
          class="member-icon-btn"
          @click="toggleMemberDrawer"
          title="群成员"
        >
          <img :src="membersIcon" alt="成员" class="member-icon" />
        </button>
        <button
          class="invite-icon-btn"
          @click="toggleInviteDrawer"
          title="邀请好友"
        >
          <img :src="inviteFriendIcon" alt="邀请" class="invite-icon" />
        </button>
      </span>
      <div class="star-title">{{ contactName }}</div>
    </div>

    <div ref="listRef" class="star-messages" @scroll="onScroll">
      <template v-for="msg in displayedMessages" :key="msg.id">
        <SystemMessage v-if="msg.messageType === 'system'" :message="msg" />
        <TextMessage v-else-if="msg.messageType === 'text'" :message="msg" />
        <ImageMessage v-else-if="msg.messageType === 'image'" :message="msg" />
        <VideoMessage v-else-if="msg.messageType === 'video'" :message="msg" />
        <VoiceMessage v-else-if="msg.messageType === 'voice'" :message="msg" />
        <FileMessage v-else-if="msg.messageType === 'file'" :message="msg" />
        <TextMessage v-else :message="msg" />
      </template>
    </div>

    <MessageSendBox :current-contact="currentContact" @go-bottom="goToBottom" />

    <MemberDrawer
      v-if="isGroupChat"
      v-model="memberDrawerOpen"
      :current-contact="currentContact"
    />

    <InvitableDrawer
      v-if="isGroupChat"
      v-model="inviteDrawerOpen"
      :current-contact="currentContact"
    />
  </div>
</template>

<style scoped>
.star-panel-bg {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(20, 24, 60, 0.85);
  border-radius: 18px 0 0 18px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  overflow: hidden;
  position: relative;
}
.star-header {
  display: flex;
  align-items: center;
  justify-content: flex-end; /* 默认靠右对齐（私聊） */
  padding: 24px 32px 12px 32px;
  background: linear-gradient(135deg, #1a237e 0%, #0d133d 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.star-header.group-chat {
  justify-content: space-between; /* 群聊时：图标在左，标题在右 */
}

.icon-buttons {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.member-icon-btn,
.invite-icon-btn {
  background: rgba(213, 133, 133, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.member-icon-btn:hover,
.invite-icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}
.member-icon,
.invite-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  /* 使用 filter 将黑色图标转换为白色，使其更醒目 */
  filter: brightness(0) invert(1);
  transition: filter 0.2s;
}
.member-icon-btn:hover .member-icon,
.invite-icon-btn:hover .invite-icon {
  /* hover 时使用更亮的颜色 */
  filter: brightness(0) invert(1) brightness(1.2);
}
.star-title {
  color: #fff;
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px #000;
  text-align: right;
}
.star-messages {
  flex: 1;
  padding: 24px 32px;
  padding-bottom: 120px; /* 预留输入区高度，避免被遮挡 */
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent; /* Firefox */
}
.star-messages::-webkit-scrollbar {
  width: 6px;
}
.star-messages::-webkit-scrollbar-track {
  background: transparent;
}
.star-messages::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.25),
    rgba(255, 255, 255, 0.15)
  );
}
.star-messages::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.35),
    rgba(255, 255, 255, 0.2)
  );
}
</style>
