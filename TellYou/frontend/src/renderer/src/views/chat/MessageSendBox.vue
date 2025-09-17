<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import type { Session } from '@renderer/status/session/class'
import { useUserStore } from '@main/electron-store/persist/user-store'

const props = defineProps<{ currentContact: Session | null }>()
const emit = defineEmits<{ (e: 'sent'): void }>()

const message = ref('')
const disabled = computed(() => !message.value || !props.currentContact)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 自动调整高度
const adjustHeight = (): void => {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  const scrollHeight = textareaRef.value.scrollHeight
  const maxHeight = 5 * 1.6 * 14 + 20 // 5行 * 行高 * 字体大小 + 内边距
  textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}

const sendMessage = async (): Promise<void> => {
  const userStore = useUserStore()
  const fromUId = userStore.myId
  const current = props.currentContact
  if (!fromUId || !current || !message.value) return

  const payload = {
    fromUId,
    toUserId: current.contactId,
    sessionId: current.sessionId,
    content: message.value
  }
  const ok = await window.electronAPI.wsSend(payload)
  if (ok) {
    message.value = ''
    await nextTick()
    emit('sent')
  }
}

const onKeydown = async (e: KeyboardEvent): Promise<void> => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    await sendMessage()
  }
}

// 监听输入变化，自动调整高度
watch(message, () => {
  nextTick(() => adjustHeight())
}, { immediate: true })
</script>

<template>
  <div class="sendbox">
    <v-btn icon class="icon-btn"><v-icon>mdi-paperclip</v-icon></v-btn>
    <v-btn icon class="icon-btn"><v-icon>mdi-image</v-icon></v-btn>
    <v-btn icon class="icon-btn"><v-icon>mdi-emoticon-outline</v-icon></v-btn>

    <div class="input-wrap">
      <textarea
        ref="textareaRef"
        v-model="message"
        class="input"
        rows="1"
        placeholder="输入消息..."
        @keydown="onKeydown"
        @input="adjustHeight"
      />
    </div>

    <v-btn color="primary" :disabled="disabled" @click="sendMessage" class="send-btn">
      <v-icon>mdi-send</v-icon>
    </v-btn>
  </div>
</template>

<style scoped>
.sendbox {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 12px 24px 20px 24px;
  background: linear-gradient(0deg, rgba(13,19,61,0.96) 90%, rgba(13,19,61,0.0) 100%);
  z-index: 3;
  border-radius: 0 0 0 18px;
  min-height: 88px;
}
.icon-btn {
  background: #fff;
  color: #1a237e;
  margin-right: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  transition: transform 0.2s, box-shadow 0.2s;
}
.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(0,0,0,0.2);
}
.input-wrap {
  flex: 1;
  min-width: 0;
  margin: 0 10px;
  border-radius: 20px;
  padding: 10px 16px;
  background: rgba(255,255,255,0.10);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.15), 0 2px 8px rgba(31,38,135,0.12);
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.input-wrap:focus-within {
  background: rgba(255,255,255,0.14);
  border-color: rgba(255,255,255,0.2);
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.15), 0 2px 8px rgba(31,38,135,0.12), 0 0 0 2px rgba(255,255,255,0.08);
}
.input {
  width: 100%;
  max-height: 96px;
  min-height: 20px;
  line-height: 1.6;
  font-size: 14px;
  color: #fff;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: height 0.2s ease-out;
  overflow-y: auto;
}
.send-btn {
  border-radius: 20px;
  height: 44px;
  min-width: 44px;
  box-shadow: 0 2px 8px rgba(31, 38, 135, 0.18);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(31, 38, 135, 0.25);
}
.send-btn:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: 0 2px 8px rgba(31, 38, 135, 0.18);
}
</style>
