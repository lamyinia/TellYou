<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessageStore } from '@renderer/status/message/store'
import { resolveAvatar, onAvatarError } from '@renderer/utils/process'
import { useSessionStore } from '@renderer/status/session/store'
import { DetailContact } from '@renderer/views/relation/ContactManagementView.vue'
import Avatar from '@renderer/components/Avatar.vue'

const props = defineProps<{ contact: DetailContact | null }>()
const contact = computed(() => props.contact)

const router = useRouter()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

const handleSendMessage = (): void => {
  if (!contact.value) return
  const sessionId = contact.value.sessionId
  messageStore.setCurrentSession(sessionId)
  sessionStore.setCurrentSessionId(sessionId)
  router.push('/chat')
}

const handleDelete = (): void => {
  // 预留：删除联系人逻辑
}

</script>

<template>
  <div v-if="contact" class="cm-detail">
    <div class="cm-header">
      <img class="cm-avatar-lg" :src="resolveAvatar(contact.avatar)" @error="onAvatarError" />
      <div class="cm-summary">
        <div class="cm-nickname">{{ contact.name }}</div>
      </div>
      <div class="cm-actions">
        <v-btn size="small" color="primary" variant="elevated" @click="handleSendMessage"
          >发消息</v-btn>
        <v-btn size="small" color="error" variant="tonal" class="ml-2" @click="handleDelete"
          >删除联系人</v-btn
        >
      </div>
    </div>
    <div class="cm-info">
      <div class="cm-info-item">
        <span>性别</span>
        <span>{{ contact.sex ? contact.sex : '未知' }}</span>
      </div>
      <div class="cm-info-item">
        <span>个性签名</span>
        <span>{{contact.signature ? contact.signature : '这个人很懒，什么都没有写~'}}</span>
      </div>
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
  object-fit: cover;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.cm-summary {
  margin-left: 16px;
}
.cm-nickname {
  font-size: 20px;
  font-weight: 700;
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
.cm-empty {
  opacity: 0.7;
  text-align: center;
  padding: 32px 0;
}
</style>
