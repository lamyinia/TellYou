<script setup lang="ts">
import { computed } from "vue";
import { useSessionStore } from "@renderer/status/session/store";
import type { Session } from "@shared/types/session";
import ContactItem from "./ContactItem.vue";

const store = useSessionStore();
const sessions = computed<Session[]>(() => store.sortedSessions);
const emit = defineEmits<{
  /**
   * 选择联系人，传递给[Chat.vue]($frontend/src/renderer/src/views/chat/Chat.vue)
   * @param contact - 选中的联系人
   */
  (e: "contact-selected", contact: Session): void;
}>();
const selectContact = (contact: Session): void => {
  emit("contact-selected", contact);
};
</script>

<template>
  <div class="contact-bg">
<!--    <div>-->
<!--      <v-text-field-->
<!--        prepend-inner-icon="iconfont icon-search"-->
<!--        placeholder="搜索联系人..."-->
<!--        class="search-field"-->
<!--        hide-details-->
<!--      />-->
<!--    </div>-->
    <div class="contact-list">
      <template v-if="sessions.length > 0">
        <v-list>
          <v-list-item
            v-for="item in sessions"
            :key="item.sessionId"
            v-memo="[
              item.unreadCount,
              item.lastMsgTime,
              item.lastMsgContent,
              item.contactName,
              item.isPinned,
              item.contactType,
              item.contactId,
            ]"
            class="session-item"
            @click="selectContact(item)"
          >
            <ContactItem :session="item" />
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
  background: linear-gradient(
    135deg,
    rgba(25, 35, 85, 0.95) 0%,
    rgba(35, 45, 105, 0.95) 50%,
    rgba(25, 35, 85, 0.95) 100%
  );
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
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(
      circle at 30% 20%,
      rgba(30, 144, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 70% 80%,
      rgba(30, 144, 255, 0.08) 0%,
      transparent 50%
    );
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
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%
  ) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 12px !important;
  backdrop-filter: blur(6px) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 6px 16px rgba(0, 0, 0, 0.12) !important;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease !important;
}

/* 彻底移除可能来源于 Vuetify 的顶部留白 */
.search-field:deep(.v-input__control) {
  padding-top: 0 !important;
}
.search-field:deep(.v-field) {
  margin-top: 0 !important;
}
.search-field:deep(.v-field__field) {
  padding-top: 0 !important;
}
.search-field:deep(.v-field__input) {
  margin-top: 0 !important;
}
.search-field:deep(.v-input) {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

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
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12) 0%,
    rgba(255, 255, 255, 0.06) 100%
  ) !important;
}

.search-field:deep(.v-field--focused) {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 0 2px rgba(86, 164, 255, 0.35),
    0 8px 20px rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(86, 164, 255, 0.45) !important;
}

.search-field .v-input__control,
.search-field .v-field,
.search-field .v-field__field,
.search-field input {
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
  overflow-y: auto; /* 让该容器成为真正的滚动容器，便于自定义滚动条生效 */
  overflow-x: hidden;
  scrollbar-gutter: stable; /* 避免滚动条出现时布局抖动（Chromium/Edge/Electron 支持） */
  /* Firefox 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.contact-list :deep(.v-list) {
  background: transparent !important;
  box-shadow: none !important;
  flex: 1;
  min-height: 0;
  padding-bottom: 12px;
  overflow: visible; /* 让父容器负责滚动，避免 vuetify 列表自身产生滚动条 */
}

.contact-list::-webkit-scrollbar {
  width: 6px; /* 更细腻 */
  height: 6px;
}

.contact-list::-webkit-scrollbar-track {
  background: transparent; /* 让轨道更柔和融入背景 */
}

.contact-list::-webkit-scrollbar-thumb {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.35),
    rgba(255, 255, 255, 0.18)
  );
  border-radius: 8px;
  border: 2px solid transparent; /* 通过透明边框营造内边距，更细的视觉效果 */
  background-clip: padding-box;
  min-height: 40px;
  transition:
    background 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.7;
}

.contact-list:hover::-webkit-scrollbar-thumb {
  opacity: 1;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.5),
    rgba(255, 255, 255, 0.28)
  );
}

.contact-list::-webkit-scrollbar-thumb:active {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.65),
    rgba(255, 255, 255, 0.38)
  );
}

.v-list-item.session-item {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(255, 255, 255, 0.04) 100%
  );
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

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes glow {
  from {
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 0 5px rgba(255, 215, 0, 0.3);
  }
  to {
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(255, 215, 0, 0.6);
  }
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
