<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageStore } from '@renderer/status/message/message-store'
import { useSessionStore } from '@renderer/status/session/session-store'

interface SimpleContact {
  id: string
  name: string
  avatar?: string
}

const props = defineProps<{ contact: SimpleContact | null }>()
const contact = computed(() => props.contact)

const router = useRouter()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

const handleSendMessage = (): void => {
  if (!contact.value) return
  const sessionId = contact.value.id
  // 同时设置两个 store 的当前会话
  messageStore.setCurrentSession(sessionId)
  sessionStore.setCurrentSessionId(sessionId)
  router.push('/chat')
}

const handleSetRemark = (): void => {
  // 预留：打开备注设置弹窗
}
const handleDelete = (): void => {
  // 预留：删除联系人逻辑
}
</script>

<template>
  <div class="cm-detail" v-if="contact">
    <div class="cm-header">
      <div class="cm-avatar-lg"></div>
      <div class="cm-summary">
        <div class="cm-nickname">{{ contact.name }}</div>
        <div class="cm-remark">备注：{{ contact.name }}</div>
        <div class="cm-id">ID：{{ contact.id }}</div>
      </div>
      <div class="cm-actions">
        <v-btn size="small" color="primary" variant="elevated" @click="handleSendMessage">发消息</v-btn>
        <v-btn size="small" color="secondary" variant="tonal" class="ml-2" @click="handleSetRemark">设置备注</v-btn>
        <v-btn size="small" color="error" variant="tonal" class="ml-2" @click="handleDelete">删除联系人</v-btn>
      </div>
    </div>

    <div class="cm-info">
      <div class="cm-info-item"><span>性别</span><span>未知</span></div>
      <div class="cm-info-item"><span>地区</span><span>未知</span></div>
      <div class="cm-info-item"><span>个性签名</span><span>这个人很懒，什么都没有写~</span></div>
    </div>
  </div>
  <div v-else class="cm-empty">请选择联系人</div>
</template>

<style scoped>
.cm-detail {
  width: 100%;
  padding: 24px 32px;
}
.cm-header {
  display: flex;
  align-items: center;
}
.cm-avatar-lg {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5c6bc0, #7986cb);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.cm-summary {
  margin-left: 16px;
}
.cm-nickname {
  font-size: 20px;
  font-weight: 700;
}
.cm-remark, .cm-id {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}
.cm-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.cm-info {
  margin-top: 24px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
}
.cm-info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.cm-info-item:last-child {
  border-bottom: none;
}
.cm-empty { opacity: 0.7; text-align: center; padding: 32px 0; }
</style>
