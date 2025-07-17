<template>
    <v-sheet class="fill-height pa-0">
      <v-text-field
        prepend-inner-icon="mdi-magnify"
        placeholder="搜索联系人..."
        dense
        solo
        class="ma-4"
      />
      <v-list>
        <v-subheader>最近聊天</v-subheader>
        <v-list-item v-for="item in contacts" :key="item.id" :active="item.active">
          <v-list-item-avatar color="primary">
            <span>{{ item.avatar }}</span>
          </v-list-item-avatar>
          <v-list-item-content>
            <v-list-item-title>{{ item.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ item.lastMsg }}</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <span class="text-caption grey--text">{{ item.time }}</span>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-sheet>
  </template>
  <script setup lang="ts">
  const contacts = [
    { id: 1, name: '张三', avatar: '张', lastMsg: '好的，明天见！', time: '14:30', active: true },
    { id: 2, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
    { id: 3, name: '王五', avatar: '王', lastMsg: '[图片]', time: '12:20', active: false }
  ]
  </script>