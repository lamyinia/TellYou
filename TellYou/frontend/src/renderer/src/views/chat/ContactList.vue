<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@renderer/status/session/store'
import type { Session } from '@renderer/status/session/class'
import { briefMsg, formatTime, onAvatarError } from '@shared/utils/process'

const store = useSessionStore()
const sessions = computed<Session[]>(() => store.sortedSessions)
const emit = defineEmits<{ (e: 'contact-selected', contact: Session): void }>()
const selectContact = (contact: Session): void => {
  contact.sessionId = String(contact.sessionId)
  contact.contactId = String(contact.contactId)
  emit('contact-selected', contact)
}
</script>

<template>
  <div class="contact-bg">
    <div>
      <v-text-field
        prepend-inner-icon="iconfont icon-search"
        placeholder="搜索联系人..."
        class="search-field"
        hide-details
      />
    </div>
    <div class="contact-list">
      <template v-if="sessions.length > 0">
        <v-list>
          <v-list-item v-for="item in sessions" :key="item.sessionId" class="session-item" @click="selectContact(item)">
            <div class="row-wrap">
              <div class="avatar-box">
                <img
                  class="contact-avatar"
                  :src="item.contactAvatar"
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
      </template>
      <template v-else>
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <div class="empty-text">暂无联系人</div>
          <div class="empty-subtitle">开始添加好友吧</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.contact-bg {
  height: 100%;
  width: 100%;
  border-radius: 18px;
  background: linear-gradient(135deg,
    rgba(25, 35, 85, 0.95) 0%,
    rgba(35, 45, 105, 0.95) 50%,
    rgba(25, 35, 85, 0.95) 100%);
  backdrop-filter: blur(8px);
  box-shadow:
    0 8px 32px 0 rgba(13, 19, 61, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  position: relative;
  overflow: hidden;
}

.contact-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(30, 144, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(30, 144, 255, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.search-field {
  width: 100%;
  margin: 0 0 14px 0; /* 只保留底部边距 */
  border-radius: 12px;
  color: #fff !important;
  min-height: 20px !important;
  font-size: 12px;
  position: relative;
  z-index: 1;
  flex-shrink: 0; /* 防止搜索框被压缩 */
}

/* 让搜索框与背景更融合的玻璃风格 */
.search-field:deep(.v-field) {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(6px) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 16px rgba(0, 0, 0, 0.12) !important;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
}

/* 彻底移除可能来源于 Vuetify 的顶部留白 */
.search-field:deep(.v-input__control) { padding-top: 0 !important; }
.search-field:deep(.v-field) { margin-top: 0 !important; }
.search-field:deep(.v-field__field) { padding-top: 0 !important; }
.search-field:deep(.v-field__input) { margin-top: 0 !important; }
.search-field:deep(.v-input) { margin-top: 0 !important; margin-bottom: 0 !important; }

/* 包裹搜索框的第一个容器去除任何默认外边距/内边距 */
.contact-bg > div:first-child {
  margin: 0 !important;
  padding: 14px !important; /* 统一内边距 */
  width: 100%;
  box-sizing: border-box;
}

.search-field:deep(.v-field__overlay),
.search-field:deep(.v-field__outline) {
  display: none !important; /* 去掉双重描边导致的割裂感 */
}

.search-field:deep(.v-field__input) {
  padding-left: 12px !important;
  color: #fff !important;
}

.search-field:deep(.v-icon) {
  color: rgba(255, 255, 255, 0.9) !important;
}

.search-field:deep(input::placeholder) {
  color: rgba(255, 255, 255, 0.85) !important;
  opacity: 0.8 !important;
}

.search-field:hover:deep(.v-field) {
  border-color: rgba(255, 255, 255, 0.22) !important;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%) !important;
}

.search-field:deep(.v-field--focused) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 2px rgba(86, 164, 255, 0.35), 0 8px 20px rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(86, 164, 255, 0.45) !important;
}

.search-field .v-input__control, .search-field .v-field, .search-field .v-field__field, .search-field input {
  min-height: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  color: #fff !important;
  font-size: 15px !important;
}

.search-field input::placeholder {
  color: #fff !important;
  opacity: 0.7;
}

.contact-list {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 0 18px 18px;
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 14px 14px 14px;
}

.contact-list :deep(.v-list) {
  background: transparent !important;
  box-shadow: none !important;
  flex: 1;
  min-height: 0;
  padding-bottom: 12px;
}

.contact-list::-webkit-scrollbar {
  width: 5px;
  background: rgba(24, 28, 70, 0.3);
  border-radius: 8px;
}

.contact-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #092a43 0%, #04165e 100%);
  border-radius: 8px;
  min-height: 40px;
}

.contact-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #1d12b5 0%, #2e0c83 100%);
}

.contact-list::-webkit-scrollbar-track {
  background: #181c46;
  border-radius: 8px;
}

.v-list-item.session-item {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin: 6px 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0 !important;
  min-height: 72px;
  backdrop-filter: blur(4px);
  position: relative;
  overflow: hidden;
}

.v-list-item.session-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.05) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.v-list-item.session-item:hover {
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.15) 0%,
    rgba(255, 255, 255, 0.08) 100%) !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.v-list-item.session-item:hover::before {
  opacity: 1;
}

.row-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px; /* 增大内边距与高度 */
  width: 100%;
  position: relative;
  z-index: 1;
}

.avatar-box {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
}

.contact-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: inline-block;
  object-fit: cover;
  background: #fff;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.contact-avatar:hover {
  transform: scale(1.05);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.2),
    0 3px 6px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.contact-tag {
  position: absolute;
  left: -3px;
  top: -3px;
  z-index: 3;
  background: linear-gradient(135deg, #24acf2 0%, #1e88e5 100%);
  color: #fff;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 12px;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.badge {
  position: absolute;
  right: -3px;
  top: -3px;
  background: linear-gradient(135deg, #e53935 0%, #d32f2f 100%);
  color: #fff;
  border-radius: 12px;
  font-size: 11px;
  padding: 2px 6px;
  line-height: 16px;
  min-width: 18px;
  text-align: center;
  z-index: 3;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
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
  margin-top: 4px;
  white-space: nowrap;
}

.pin-flag {
  color: #ffd700;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 5px rgba(255, 215, 0, 0.3); }
  to { text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 0 10px rgba(255, 215, 0, 0.6); }
}

.time {
  font-size: 12px;
  color: #a0b3c7;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  opacity: 0.8;
}

/* 右侧文本列 */
.content-col {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: #e9f1f4;
  gap: 4px;
}

.name {
  font-size: 15px;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.3px;
}

.subtitle {
  font-size: 13px;
  color: #b8c5d1;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  opacity: 0.9;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  padding: 60px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.empty-text {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  opacity: 0.7;
}
</style>
