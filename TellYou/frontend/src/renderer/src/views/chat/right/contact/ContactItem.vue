<script setup lang="ts">
import { computed } from 'vue';
import Avatar from '@renderer/components/Avatar.vue';
import type { Session } from '@shared/types/session';
import { briefMsg, formatTime } from '@shared/utils/process';

const props = defineProps<{ session: Session;}>();

const lastMsgText = computed(() => briefMsg(props.session.lastMsgContent));
const timeText = computed(() => formatTime(props.session.lastMsgTime));
</script>

<template>
  <div class="row-wrap">
    <div class="avatar-box">
      <Avatar
        :target-id="String(props.session.contactId)"
        :version="'9999'"
        :size="50"
        :name="props.session.contactName || '未知'"
        :show-strategy="'thumbedAvatarUrl'"
        show-shape="normal"
        side="left"
      />
      <span v-if="props.session.contactType === 2" class="contact-tag">群</span>
      <span v-if="props.session.unreadCount > 0" class="badge">{{ props.session.unreadCount > 99 ? "99+" : props.session.unreadCount }}</span>
    </div>

    <div class="content-col">
      <div class="name">{{ props.session.contactName }}</div>
      <div class="subtitle">{{ lastMsgText }}</div>
      <div class="footer-row">
        <i
          v-if="props.session.isPinned"
          class="iconfont icon-top pin-flag"
          title="置顶"
        ></i>
        <div class="time">{{ timeText }}</div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.row-wrap {
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  column-gap: 12px;
  padding: 12px 14px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.row-wrap > .content-col {
  grid-column: 2;
}

.avatar-box {
  position: relative;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  align-self: start;
  margin-top: -2px;
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

.footer-row {
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
</style>
