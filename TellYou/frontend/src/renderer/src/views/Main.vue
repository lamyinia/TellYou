<script setup lang="ts">
import RightNavBar from '../components/RightNavBar.vue'
import { onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '@renderer/status/session/store'
import { useMessageStore } from '@renderer/status/message/store'
import { useApplicationStore } from '@renderer/status/application/store'
import { useBlackStore } from '@renderer/status/black/store'

const sessionStore = useSessionStore()
const messageStore = useMessageStore()
const applicationStore = useApplicationStore()
const blackStore = useBlackStore()

onMounted(async () => {
  console.log('Main.vue mounted, 开始初始化数据')
  sessionStore.init()
  messageStore.init()
  applicationStore.init()
  blackStore.init()
})
onUnmounted(() => {
  console.log('Main.vue unmounted, 清理资源')
  sessionStore.destroy()
  messageStore.destroy()
  applicationStore.destroy()
  blackStore.destroy()
})
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="main-container" style="padding: 0; height: 100vh">
        <v-row no-gutters style="height: 100%">
          <v-col style="height: 100%">
            <router-view />
          </v-col>
          <v-col cols="auto">
            <RightNavBar />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.main-container {
  height: 100vh;
  overflow: hidden;
}
</style>
