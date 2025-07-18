<template>
  <v-app>
    <chat-header />
    <v-main class="chat-main">
      <div class="chat-container">
        <div class="main-content">
          <div class="chat-panel-wrap">
            <chat-panel />
          </div>
          <div class="contact-list-wrap">
            <contact-list />
          </div>
        </div>
        <sidebar/>
      </div>
    </v-main>

  </v-app>
</template>

<script setup lang="ts">
import ChatHeader from '@renderer/components/chat/ChatHeader.vue'
import ChatPanel from '@renderer/components/chat/ChatPanel.vue'
import ContactList from '@renderer/components/chat/ContackList.vue'
import Sidebar from '@renderer/components/chat/SideBar.vue'
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
  width: 100vw;
  background: #f5f6fa;
}
.main-content {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: calc(100vw - 64px); /* 预留侧边栏宽度 */
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
  width: 260px;
  min-width: 240px;
  max-width: 280px;
  background: #fff;
  border-left: 1px solid #eee;
  overflow-y: auto;
  height: 100vh;
}
</style>
