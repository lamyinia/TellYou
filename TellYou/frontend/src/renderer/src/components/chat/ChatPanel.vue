<template>
    <v-sheet class="pa-0 fill-height d-flex flex-column" color="white">
      <!-- 聊天头部 -->
      <v-sheet class="gradient-bg pa-4 d-flex align-center justify-space-between" color="primary" dark>
        <div class="d-flex align-center">
          <v-avatar color="white" class="mr-3"><span>张</span></v-avatar>
          <div>
            <div class="text-h6">张三</div>
            <div class="text-caption">在线</div>
          </div>
        </div>
        <div>
          <v-btn icon><v-icon>mdi-phone</v-icon></v-btn>
          <v-btn icon><v-icon>mdi-video</v-icon></v-btn>
          <v-btn icon><v-icon>mdi-dots-vertical</v-icon></v-btn>
        </div>
      </v-sheet>
      <!-- 聊天消息区 -->
      <v-sheet class="flex-grow-1 overflow-y-auto pa-4">
        <!-- 消息列表后续实现 -->
        <div class="text-center text-caption grey--text">今天 14:30</div>
      </v-sheet>
      <!-- 消息输入区 -->
      <v-sheet class="pa-4" color="white" elevation="1">
        <v-row align="end" no-gutters>
          <v-col cols="auto">
            <v-btn icon><v-icon>mdi-paperclip</v-icon></v-btn>
            <v-btn icon><v-icon>mdi-image</v-icon></v-btn>
            <v-btn icon><v-icon>mdi-emoticon-outline</v-icon></v-btn>
          </v-col>
          <v-col>
            <v-textarea
              v-model="message"
              auto-grow
              rows="1"
              max-rows="4"
              placeholder="输入消息..."
              class="ma-0"
              hide-details
              solo
            />
          </v-col>
          <v-col cols="auto">
            <v-btn color="primary" :disabled="!message" @click="sendMessage">
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </v-col>
        </v-row>
      </v-sheet>
    </v-sheet>
  </template>
  <script setup lang="ts">
  import { ref } from 'vue'
  const message = ref('')
  const sendMessage = () => {
    // 发送消息逻辑
    message.value = ''
  }
  </script>
  <style scoped>
  .gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }
  </style>