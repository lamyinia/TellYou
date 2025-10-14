<script setup lang="ts">
import ChatPanel from '@renderer/views/chat/ChatPanel.vue'
import ContactList from '@renderer/views/chat/ContactList.vue'
import { computed, onMounted, ref } from 'vue'
import type { Session } from '@shared/types/session'
import { useSessionStore } from '@renderer/status/session/store'

const sessionStore = useSessionStore()

const selectedContact = ref<Session | null>(null)
const handleContactSelected = (contact: Session): void => {
  selectedContact.value = contact
}
const currentSessionId = computed(() => sessionStore.currentSessionId)

onMounted(() => {
  if (currentSessionId.value) {
    const s = sessionStore.getSession(currentSessionId.value)
    if (s) selectedContact.value = s
  }
})
</script>

<template>
  <div class="star-bg">
    <div class="chat-container">
      <div class="main-content">
        <div class="chat-panel-wrap">
<!--          <div v-for="n in 30" :key="n" class="star" :style="randomStarStyle()"></div>-->
          <ChatPanel :current-contact="selectedContact" />
        </div>
        <div class="contact-list-wrap">
<!--          <div v-for="n in 30" :key="n" class="star" :style="randomStarStyle()"></div>-->
          <ContactList @contact-selected="handleContactSelected" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.star-bg {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a237e 0%, #0d133d 100%);
  overflow: hidden;
}
.star {
  position: relative; /* 确保星星定位基准 */
  z-index: 1;
  animation: twinkle 2s infinite alternate;
  animation-delay: var(--star-delay, 0s);
}
@keyframes twinkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
    filter: blur(0px) drop-shadow(0 0 5px white);
  }
}
.chat-container {
  position: relative;
  height: 100vh;
  z-index: 2;
}
.main-content {
  display: flex;
  flex-direction: row;
  height: 100vh;
}
.chat-panel-wrap {
  flex: 1;
  min-width: 0;
  background: rgba(20, 24, 60, 0.85);
  display: flex;
  flex-direction: column;
  border-radius: 18px 0 0 18px;
  margin: 0px 0 32px 0px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  overflow: hidden;
  position: relative;
}
.contact-list-wrap {
  min-width: 200px;
  max-width: 200px;
  background: rgba(24, 28, 70, 0.92);
  border-left: 1px solid #2c2f4a;
  color: #fff;
  overflow-y: auto;
  height: 100vh;
  border-radius: 0 18px 18px 0;
  margin: 0px 0px 32px 0;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.17);
  display: flex;
  align-items: flex-start;
  padding-top: 2px; /* 移除顶部空隙 */
}
</style>
