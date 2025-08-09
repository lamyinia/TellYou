<script setup lang="ts">
import { computed, ref } from 'vue'
const message = ref('')
const sendMessage = (): void => {
  message.value = ''
}

const props = defineProps({
  currentContact: Object
})
const contactName = computed(() => {
  return props?.currentContact === Object ? {name: '你还未选择联系人'} : props?.currentContact
})

</script>

<template>
  <div class="star-panel-bg">
    <!-- 聊天头部 -->
    <div class="star-header">
      <div class="star-title"> {{contactName.name}} </div>
      <div>
        <v-btn icon><v-icon>mdi-phone</v-icon></v-btn>
        <v-btn icon><v-icon>mdi-video</v-icon></v-btn>
        <v-btn icon><v-icon>mdi-dots-vertical</v-icon></v-btn>
      </div>
    </div>

    <div class="star-messages">
      <div class="text-center text-caption grey--text">今天 14:30</div>
      <div class="star-message" v-for="i in 1" :key="i">
        <div class="star-bubble">消息 {{ i }}</div>
      </div>
    </div>

    <!-- 消息输入区 -->
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
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.star-message {
  display: flex;
  align-items: flex-end;
}
.star-bubble {
  background: linear-gradient(135deg, #3949ab 60%, #5c6bc0 100%);
  color: #fff;
  padding: 12px 20px;
  border-radius: 18px 18px 18px 4px;
  box-shadow: 0 2px 8px 0 rgba(31, 38, 135, 0.18);
  max-width: 60%;
  font-size: 1rem;
  word-break: break-all;
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
