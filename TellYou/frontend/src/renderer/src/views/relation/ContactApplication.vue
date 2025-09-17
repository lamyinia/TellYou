<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApplicationStore } from '@renderer/status/application/store'
import IncomingList from './page/IncomingList.vue'
import OutcomingList from './page/OutcomingList.vue'

const open = ref(false)
const toggle = (): void => {
  open.value = !open.value
}


const activeTab = ref<'incoming' | 'outgoing' | 'search'>('incoming')

const snackbar = ref({ show: false, text: '创建成功', color: 'info' as 'success' | 'error' | 'info' })
const notify = (text: string, color: 'success' | 'error' | 'info' = 'success'): void => {
  snackbar.value = { show: true, text, color }
}

const appStore = useApplicationStore()
onMounted(() => appStore.init())

const sendRequest = (): void => {
  appStore.sendRequest('target-user-id', remark.value)
  notify('已发送好友申请')
}


const keyword = ref('')
const remark = ref('')
</script>

<template>
  <v-btn
    class="fab"
    color="#b8c5ed"
    size="large"
    variant="elevated"
    :ripple="true"
    rounded="xl"
    @click="toggle"
  >
    <v-icon icon="mdi-bell-outline" size="24"></v-icon>
  </v-btn>

  <transition name="slide-in">
    <div v-if="open" class="drawer-wrap" @click.self="toggle">
      <div class="drawer-panel" @click.stop>
        <div class="drawer-inner drawer-theme">
          <div class="drawer-header">
            <div class="tabs">
              <v-btn
                :variant="activeTab === 'incoming' ? 'elevated' : 'tonal'"
                size="small"
                @click="activeTab = 'incoming'"
              >好友申请</v-btn>
              <v-btn
                class="ml-2"
                :variant="activeTab === 'outgoing' ? 'elevated' : 'tonal'"
                size="small"
                @click="activeTab = 'outgoing'"
              >我发起的</v-btn>
              <v-btn
                class="ml-2"
                :variant="activeTab === 'search' ? 'elevated' : 'tonal'"
                size="small"
                @click="activeTab = 'search'"
              >搜索加好友</v-btn>
            </div>
            <v-btn icon="mdi-close" variant="text" @click="toggle" />
          </div>

          <div class="drawer-content list-surface">
            <div v-if="activeTab === 'incoming'">
              <IncomingList />
            </div>
            <div v-else-if="activeTab === 'outgoing'">
              <OutcomingList />
            </div>
            <div v-else>
              <div class="search-box">
                <v-text-field
                  v-model="keyword"
                  density="compact"
                  label="搜索账号/昵称/手机号"
                  variant="outlined"
                  hide-details
                />
                <v-text-field
                  v-model="remark"
                  class="ml-2"
                  density="compact"
                  label="申请备注(可选)"
                  variant="outlined"
                  hide-details
                />
                <v-btn class="ml-2" color="primary" @click="sendRequest">发送申请</v-btn>
              </div>
              <div class="list-placeholder">搜索结果占位，待接入接口</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="5000">
    {{ snackbar.text }}
  </v-snackbar>
</template>

<style scoped>
.fab {
  position: fixed;
  color: rgba(0, 32, 243, 0.67);
  top: 30px;
  left: 10px;
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  z-index: 50;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.app-drawer :deep(.v-navigation-drawer__content) {
  background: rgba(10, 12, 32, 0.96);
}
.drawer-wrap {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 40; /* 低于悬浮按钮 z-index:50 */
}
.drawer-panel {
  position: absolute;
  top: 30px; /* 下移，避免遮挡 tabs 与按钮 */
  left: 80px; /* 不覆盖悬浮按钮 */
  bottom: 16px;
  right: 80px;
  display: flex;
}
.drawer-inner {
  max-width: 960px;
  width: 100%;
  background: rgba(10, 12, 32, 0.96);
  border-radius: 16px;
  overflow: hidden;
  margin-left: 0; /* 靠左展开 */
  padding: 16px 16px 24px;
  color: #e0e6f0;
}
.drawer-theme {
  background: linear-gradient(180deg, rgba(12,14,32,0.98) 0%, rgba(16,18,40,0.98) 100%);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
/* 左->右滑入 */
.slide-in-enter-from,
.slide-in-leave-to {
  opacity: 0;
}
.slide-in-enter-active,
.slide-in-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 16px 24px;
  color: #e0e6f0;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.tabs {
  display: flex;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.drawer-content {
  margin-top: 16px;
}
.list-surface :deep(.v-list),
.list-surface :deep(.v-list-item) {
  background: transparent !important;
  color: #e0e6f0;
}
.list-surface :deep(.v-checkbox-btn),
.list-surface :deep(.v-btn),
.list-surface :deep(.v-chip) {
  --v-theme-on-surface: #e0e6f0;
}
.toolbar {
  display: flex;
  align-items: center;
}
.list-placeholder {
  opacity: 0.7;
  padding: 16px 0;
}
.search-box {
  display: flex;
  align-items: center;
}
</style>
