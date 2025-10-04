<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Session } from '@renderer/status/session/class'
import { useMessageStore } from '@renderer/status/message/store'
import TextMessage from '@renderer/views/chat/TextMessage.vue'
import ImageMessage from '@renderer/views/chat/ImageMessage.vue'
import MessageSendBox from './MessageSendBox.vue'

const props = defineProps<{ currentContact: Session | null }>()
const contactName = computed(() => props.currentContact?.contactName || '你还未选择联系人')
const messageStore = useMessageStore()
const currentSessionId = computed(() => props.currentContact?.sessionId || '')
const listRef = ref<HTMLElement | null>(null)
const isFirstLoad = ref(true)
const preloadThreshold = 80

const messages = computed(() => {
  const id = currentSessionId.value
  if (!id) return []
  const result = messageStore.getCurrentSessionMessages(String(id))
  console.log(`ChatPanel computed messages for session ${id}:`, result.length, 'messages')
  return result
})
const displayedMessages = computed(() => [...messages.value].reverse())

watch(currentSessionId, (id) => {
  if (id) {
    isFirstLoad.value = true
    messageStore.setCurrentSession(String(id))
  }
}, { immediate: true })
watch(messages, async (val) => {
  if (!listRef.value) return
  if (isFirstLoad.value && val.length > 0) {
    await scrollToBottom()
    isFirstLoad.value = false
  }
}, { deep: true })

onMounted(async () => {
  await scrollToBottom()
})

const onSent = async (): Promise<void> => { await scrollToBottom() }
const scrollToBottom = async (): Promise<void> => {
  if (!listRef.value) return
  await nextTick()
  listRef.value.scrollTop = listRef.value.scrollHeight
  await new Promise<void>((resolve) => requestAnimationFrame(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
    resolve()
  }))
}

const onScroll = async (): Promise<void> => {
  const el = listRef.value
  const sessionId = currentSessionId.value
  if (!el || !sessionId) return
  const { scrollTop, scrollHeight, clientHeight } = el

  if (scrollTop <= preloadThreshold) {
    const prevScrollHeight = scrollHeight
    const prevTop = scrollTop
    console.log('滚动到顶部时加载旧消息')
    const loaded = await messageStore.loadOlderMessages(String(sessionId))
    if (loaded) {
      await nextTick()
      const diff = (listRef.value!.scrollHeight - prevScrollHeight)
      listRef.value!.scrollTop = prevTop + diff
    }
  }
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  if (distanceToBottom <= preloadThreshold) {
    console.log('滚动到底部时加载更新的消息')
    await messageStore.loadNewerMessages(sessionId)
  }
}
</script>

<template>
  <div class="star-panel-bg">
    <div class="star-header">
      <div class="star-title"> {{contactName}} </div>
      <div>
        <v-btn icon><v-icon>mdi-phone</v-icon></v-btn>
        <v-btn icon><v-icon>mdi-video</v-icon></v-btn>
        <v-btn icon><v-icon>mdi-dots-vertical</v-icon></v-btn>
      </div>
    </div>

    <div class="star-messages" ref="listRef" @scroll="onScroll">
      <template v-for="msg in displayedMessages" :key="msg.id">
        <TextMessage v-if="msg.messageType === 'text'" :message="msg" />
        <ImageMessage v-else-if="msg.messageType === 'image'" :message="msg" />
        <TextMessage v-else :message="msg" />
      </template>
    </div>

    <MessageSendBox :currentContact="currentContact" @sent="onSent" />
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
  justify-content: space-between;
  padding: 24px 32px 12px 32px;
  background: linear-gradient(135deg, #1a237e 0%, #0d133d 100%);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.star-title {
  color: #fff;
  font-size: 1.4rem;
  font-weight: bold;
  letter-spacing: 2px;
  text-shadow: 0 2px 8px #000;
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
  scrollbar-color: rgba(255,255,255,0.25) transparent; /* Firefox */
}
.star-messages::-webkit-scrollbar {
  width: 6px;
}
.star-messages::-webkit-scrollbar-track {
  background: transparent;
}
.star-messages::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.15));
}
.star-messages::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.2));
}
</style>
