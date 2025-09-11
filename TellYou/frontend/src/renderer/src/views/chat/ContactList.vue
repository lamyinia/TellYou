<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@renderer/status/session/session-store'
import type { Session } from '@renderer/status/session/session-class'
import { briefMsg, formatTime, onAvatarError, resolveAvatar } from '../../../../utils/process'

const store = useSessionStore()
const sessions = computed<Session[]>(() => store.sortedSessions)

const emit = defineEmits<{ (e: 'contact-selected', contact: Session): void }>()
const selectContact = (contact: Session): void => {
  // 确保会话 ID 为字符串（Session 已定义为 string，这里只是兜底）
  contact.sessionId = String(contact.sessionId)
  contact.contactId = String(contact.contactId)
  emit('contact-selected', contact)
}
</script>

<template>
  <div class="star-contact-bg">
    <div>
      <v-text-field
        prepend-inner-icon="iconfont icon-search"
        placeholder="搜索联系人..."
        class="star-search-field"
        hide-details
      />
    </div>
    <v-list class="star-list">
      <v-list-item v-for="item in sessions" :key="item.sessionId" class="session-item" @click="selectContact(item)">
        <div class="row-wrap">
          <div class="avatar-box">
            <img
              class="star-contact-avatar"
              :src="resolveAvatar(item.contactAvatar)"
              alt="avatar"
              referrerpolicy="no-referrer"
              crossorigin="anonymous"
              loading="lazy"
              @error="onAvatarError"
            />
            <span v-if="item.contactType === 2" class="contact-tag">群</span>
            <span v-if="item.unreadCount > 0" class="badge">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</span>

          </div>

          <div class="content-col">
            <div class="name">{{ item.contactName }}</div>
            <div class="subtitle">{{ briefMsg(item.lastMsgContent) }}</div>
            <div class="footer-row">
              <i v-if="item.isPinned" class="iconfont icon-top pin-flag" title="置顶"></i>
              <div class="time">{{ formatTime(item.lastMsgTime) }}</div>
            </div>
          </div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped>
.star-contact-bg {
  height: 100%;
  border-radius: 0 18px 18px 0;
  box-shadow: 0 8px 32px 0 rgba(211, 0, 244, 0.17);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 0;
  padding-right: 0;
}

.star-search-field {
  width: 100%;
  margin: 0px 40px 20px 10px;
  border-radius: 12px;
  color: #fff !important;
  min-height: 20px !important;
  font-size: 12px;
}

.star-search-field .v-input__control, .star-search-field .v-field, .star-search-field .v-field__field, .star-search-field input {
  min-height: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  color: #fff !important;
  font-size: 15px !important;
}

.star-search-field input::placeholder {
  color: #fff !important;
  opacity: 0.7;
}

.star-list {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 0 18px 0;
  padding-bottom: 12px;
}

.star-list::-webkit-scrollbar {
  width: 5px;
  background: #ba0d9c;
  border-radius: 8px;
}

.star-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #092a43 0%, #04165e 100%);
  border-radius: 8px;
  min-height: 40px;
}

.star-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #1d12b5 0%, #2e0c83 100%);
}

.star-list::-webkit-scrollbar-track {
  background: #181c46;
  border-radius: 8px;
}

.v-list-item.session-item {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin: 6px 8px;
  transition: background 0.2s;
  padding: 0 !important;
  min-height: 72px;
}

.v-list-item.session-item:hover {
  background: rgba(255, 255, 255, 0.12) !important;
}

.row-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px; /* 增大内边距与高度 */
  width: 100%;
}

.avatar-box {
  position: relative;
  width: 42px;
  height: 35px;
  flex: 0 0 42px;
}

.star-contact-avatar {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.12);
  display: inline-block;
  object-fit: cover;
  background: #fff;
}

.contact-tag {
  position: absolute;
  left: -2px;
  top: -2px;
  z-index: 2;
  background: #24acf2;
  color: #fff;
  font-size: 10px;
  padding: 0 3px;
  border-radius: 2px;
  line-height: 14px;
}

.badge {
  position: absolute;
  right: -2px;
  top: -2px;
  background: #e53935;
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  padding: 0 5px;
  line-height: 18px;
  min-width: 18px;
  text-align: center;
  z-index: 2;
}


.meta-col {
  flex: 0 0 100px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.footer-row { /* 新增第二行：时间与置顶 */
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
  white-space: nowrap;
}

.pin-flag {
  color: #8f8f8f;
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #90a4ae;
}

/* 右侧文本列 */
.content-col {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: #e9f1f4;
}

.name {
  font-size: 14px;
  color: #cdede7;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 13px;
  color: #eefaf5;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
