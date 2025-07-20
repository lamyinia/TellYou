<template>
  <div class="chat-main">
    <div class="chat-container">
      <div class="main-content">
        <div class="chat-panel-wrap">
          <chat-panel />
        </div>
        <div class="contact-list-wrap">
          <contact-list />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'
import ContactList from '@renderer/components/chat/ContackList.vue'
</script>

<style scoped>
.chat-main {
  height: 100vh;
  background: #f5f6fa;
  overflow: hidden;
}
.chat-container {
  position: relative;
  height: 100vh;
  background: #f5f6fa;
}
.main-content {
  display: flex;
  flex-direction: row;
  height: 100vh;
  background: #f5f6fa;
  position: relative;
}
.chat-panel-wrap {
  flex: 1;
  min-width: 0;
  background: #fff;
  overflow-y: auto;
  height: 100vh;
}
.contact-list-wrap {
  min-width: 150px;
  background: #fff;
  border-left: 1px solid #eee;
  overflow-y: auto;
  height: 100vh;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 #fff;
}
.contact-list-wrap::-webkit-scrollbar {
  width: 6px;
  background: #fff;
}
.contact-list-wrap::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 6px;
}
.contact-list-wrap::-webkit-scrollbar-track {
  background: #fff;
  border-radius: 6px;
}
.contact-list-wrap::-webkit-scrollbar-thumb:hover {
  background: #bdbdbd;
}
</style>
