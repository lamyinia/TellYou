<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@renderer/status/session/store'
import type { Session } from '@renderer/status/session/class'
import { briefMsg, formatTime, onAvatarError, resolveAvatar } from '../../../../utils/process'

const store = useSessionStore()
const sessions = computed<Session[]>(() => store.sortedSessions)
const src = 'tellyou://avatar?path=C%3A%5CUsers%5Clanyo%5CAppData%5CRoaming%5Ctell-you_1%5Ccaching%5Cavatar%5C1948031012053333361%5CoriginalAvatarUrl%5Cindex.avif'
const emit = defineEmits<{ (e: 'contact-selected', contact: Session): void }>()
const selectContact = (contact: Session): void => {
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
              :src="src"
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
  background: linear-gradient(135deg,
    rgba(13, 19, 61, 0.95) 0%,
    rgba(25, 35, 85, 0.92) 25%,
    rgba(35, 45, 105, 0.88) 50%,
    rgba(25, 35, 85, 0.92) 75%,
    rgba(13, 19, 61, 0.95) 100%);
  backdrop-filter: blur(8px);
  box-shadow:
    0 8px 32px 0 rgba(211, 0, 244, 0.17),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 0;
  padding-right: 0;
  padding-top: 0;
  position: relative;
  overflow: hidden;
}

.star-contact-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 22% 10%, rgba(138, 43, 226, 0.10) 0%, transparent 46%),
    radial-gradient(circle at 80% 80%, rgba(30, 144, 255, 0.12) 0%, transparent 50%),
    radial-gradient(circle at 40% 60%, rgba(255, 20, 147, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.star-search-field {
  width: 100%;
  margin: 0 14px 14px 14px; /* 去除顶部空隙 */
  border-radius: 12px;
  color: #fff !important;
  min-height: 20px !important;
  font-size: 12px;
  position: relative;
  z-index: 1;
}

/* 让搜索框与背景更融合的玻璃风格 */
.star-search-field:deep(.v-field) {
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
.star-search-field:deep(.v-input__control) { padding-top: 0 !important; }
.star-search-field:deep(.v-field) { margin-top: 0 !important; }
.star-search-field:deep(.v-field__field) { padding-top: 0 !important; }
.star-search-field:deep(.v-field__input) { margin-top: 0 !important; }
.star-search-field:deep(.v-input) { margin-top: 0 !important; margin-bottom: 0 !important; }

/* 包裹搜索框的第一个容器去除任何默认外边距/内边距 */
.star-contact-bg > div:first-child { margin: 0 !important; padding: 0 !important; }

.star-search-field:deep(.v-field__overlay),
.star-search-field:deep(.v-field__outline) {
  display: none !important; /* 去掉双重描边导致的割裂感 */
}

.star-search-field:deep(.v-field__input) {
  padding-left: 12px !important;
  color: #fff !important;
}

.star-search-field:deep(.v-icon) {
  color: rgba(255, 255, 255, 0.9) !important;
}

.star-search-field:deep(input::placeholder) {
  color: rgba(255, 255, 255, 0.85) !important;
  opacity: 0.8 !important;
}

.star-search-field:hover:deep(.v-field) {
  border-color: rgba(255, 255, 255, 0.22) !important;
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%) !important;
}

.star-search-field:deep(.v-field--focused) {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 2px rgba(86, 164, 255, 0.35), 0 8px 20px rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(86, 164, 255, 0.45) !important;
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
  position: relative;
  z-index: 1;
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
  background: linear-gradient(135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin: 6px 8px;
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

.star-contact-avatar {
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

.star-contact-avatar:hover {
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
</style>
