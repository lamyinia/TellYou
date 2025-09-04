<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { Session } from '@renderer/status/session/session-class'
import { useMessageStore } from '@renderer/status/message/message-store'
import TextMessage from '@renderer/views/chat/TextMessage.vue'
import ImageMessage from '@renderer/views/chat/ImageMessage.vue'

const message = ref('')
const sendMessage = (): void => {
  message.value = ''
}

const props = defineProps<{ currentContact: Session | null }>()
const contactName = computed(() => props.currentContact?.contactName || '你还未选择联系人')

const messageStore = useMessageStore()
messageStore.init()

const currentSessionId = computed(() => props.currentContact?.sessionId || 0)

const listRef = ref<HTMLElement | null>(null)
const isFirstLoad = ref(true)

const scrollToBottom = async (): Promise<void> => {
  if (!listRef.value) return
  await nextTick()
  listRef.value.scrollTop = listRef.value.scrollHeight
  await new Promise<void>((resolve) => requestAnimationFrame(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
    resolve()
  }))
}

watch(currentSessionId, (id) => {
  if (id > 0) {
    isFirstLoad.value = true
    messageStore.setCurrentSession(id)
  }
}, { immediate: true })

const messages = computed(() => {
  const id = currentSessionId.value
  if (!id) return []
  return messageStore.getCurrentSessionMessages(id)
})

// 显示顺序：底部是最新消息
const displayedMessages = computed(() => [...messages.value].reverse())

// 首次加载后滚动到底部
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

const preloadThreshold = 80

const onScroll = async (): Promise<void> => {
  const el = listRef.value
  const sessionId = currentSessionId.value
  if (!el || !sessionId) return

  const { scrollTop, scrollHeight, clientHeight } = el

  // 触顶：加载更早的消息，保持视觉位置
  if (scrollTop <= preloadThreshold) {
    const prevScrollHeight = scrollHeight
    const prevTop = scrollTop
    const loaded = await messageStore.loadOlderMessages(sessionId)
    if (loaded) {
      await nextTick()
      const diff = (listRef.value!.scrollHeight - prevScrollHeight)
      listRef.value!.scrollTop = prevTop + diff
    }
  }

  // 触底：加载更新的消息（如果有）
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  if (distanceToBottom <= preloadThreshold) {
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

    <div class="star-input-wrap">
      <v-btn icon><v-icon>mdi-paperclip</v-icon></v-btn>
      <v-btn icon><v-icon>mdi-image</v-icon></v-btn>
      <v-btn icon><v-icon>mdi-emoticon-outline</v-icon></v-btn>
      <v-textarea
        v-model="message"
        auto-grow
        rows="1"
        max-rows="4"
        placeholder="输入消息..."
        class="star-input"
        hide-details
        solo
      />
      <v-btn color="primary" :disabled="!message" @click="sendMessage" class="star-send-btn">
        <v-icon>mdi-send</v-icon>
      </v-btn>
    </div>
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
}
.star-input-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 32px 24px 32px;
  background: linear-gradient(0deg, rgba(13,19,61,0.95) 80%, rgba(13,19,61,0.0) 100%);
  z-index: 3;
  border-radius: 0 0 0 18px;
  min-height: 88px; /* 固定最小高度便于上方留白计算 */
}
.star-input {
  flex: 1;
  min-width: 0;
  margin: 0 12px;
  background: rgba(255,255,255,0.12);
  color: #fff;
  border-radius: 22px;
  box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.08);
  transition: background 0.3s;
}
.star-send-btn {
  border-radius: 22px;
  height: 44px;
  min-width: 44px;
  box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.18);
}
</style>
