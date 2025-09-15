<script setup lang="ts">
import { ref } from 'vue'

// 悬浮按钮显示/隐藏抽屉
const open = ref(false)
const toggle = (): void => {
  open.value = !open.value
}

// Tabs：好友申请、我发起的、搜索加好友
const activeTab = ref<'incoming' | 'outgoing' | 'search'>('incoming')

// 批量选择占位
// const selectedIds = ref<string[]>([])
const allChecked = ref(false)
const toggleAll = (): void => {
  allChecked.value = !allChecked.value
  // 真实数据接入后填充 selectedIds
}

// Snackbar 提示
const snackbar = ref({ show: false, text: '', color: 'success' as 'success' | 'error' | 'info' })
const notify = (text: string, color: 'success' | 'error' | 'info' = 'success'): void => {
  snackbar.value = { show: true, text, color }
}

// 提交/操作占位
const approveSelected = (): void => notify('已同意所选申请')
const rejectSelected = (): void => notify('已拒绝所选申请')
const cancelSelected = (): void => notify('已撤回所选申请')
const sendRequest = (): void => notify('已发送好友申请')

// 搜索占位
const keyword = ref('')
const remark = ref('')
</script>

<template>
  <!-- 悬浮按钮：左上固定，绿色，波纹 -->
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

  <!-- 自定义抽屉：不覆盖悬浮按钮，边界留 16px，左->右滑入 -->
  <transition name="slide-in">
    <div v-if="open" class="drawer-wrap" @click.self="toggle">
      <div class="drawer-panel" @click.stop>
        <div class="drawer-inner">
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

          <div class="drawer-content">
            <!-- Tab: 好友申请（批量处理 + 分页占位） -->
            <div v-if="activeTab === 'incoming'">
              <div class="toolbar">
                <v-checkbox
                  v-model="allChecked"
                  label="全选"
                  hide-details
                  density="compact"
                  @change="toggleAll"
                />
                <div class="ml-2"></div>
                <v-btn size="small" color="primary" @click="approveSelected">同意</v-btn>
                <v-btn
                  class="ml-2"
                  size="small"
                  color="error"
                  variant="tonal"
                  @click="rejectSelected"
                >拒绝</v-btn>
              </div>
              <div class="list-placeholder">待接入接口，显示别人对我的申请，支持分页</div>
            </div>

            <!-- Tab: 我发起的申请（批量撤回 + 分页占位） -->
            <div v-else-if="activeTab === 'outgoing'">
              <div class="toolbar">
                <v-checkbox
                  v-model="allChecked"
                  label="全选"
                  hide-details
                  density="compact"
                  @change="toggleAll"
                />
                <v-btn class="ml-2" size="small" color="warning" @click="cancelSelected"
                  >撤回申请</v-btn
                >
              </div>
              <div class="list-placeholder">待接入接口，显示我对别人的申请，支持分页</div>
            </div>

            <!-- Tab: 搜索加好友（备注输入） -->
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

  <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="2000">
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
  right: 16px;
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
