<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { getUserStore } from '@renderer/stores/GlobalStore'

const userStore = getUserStore()

const onTop = () => window.ipcRenderer.send('window-top')
const onMin = () => window.ipcRenderer.send('window-min')
const onMax = () => window.ipcRenderer.send('window-max')
const onClose = () => window.ipcRenderer.send('window-hide-to-tray')

onMounted(async () => {
  await userStore.initStore()
})
const showWindowControls = computed(() => userStore.isLogin)

</script>

<template>
    <div class="window-drag-bar">
      <span> Tell You - 通彼</span>
      <div v-if="showWindowControls" class="window-controls">
        <i class="iconfont icon-top" title="置顶" @click="onTop"></i>
        <i class="iconfont icon-min" title="最小化" @click="onMin"></i>
        <i class="iconfont icon-max" title="最大化" @click="onMax"></i>
        <i class="iconfont icon-close" title="关闭" @click="onClose"></i>
      </div>
    </div>
    <router-view />
</template>

<style scoped>

.window-drag-bar {
  height: 25px;
  width: 100%;
  -webkit-app-region: drag;
  background: #111827 !important;
  color: #fff;
  display: flex;
  align-items: center;
  padding-left: 12px;
  user-select: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.window-controls {
  position: absolute;
  right: 16px;
  top: 0;
  height: 100%;
  display: flex;
  line-height: 25px; /* 替代 align-items: center */
  gap: 16px;
  -webkit-app-region: no-drag; /* 让按钮可点击 */
  color: white;
}
.window-controls .iconfont {
  font-size: 16px;
  color: #bbb;
  cursor: pointer;
  transition: color 0.2s;
}
.window-controls .iconfont:hover {
  color: #4caf50;
}

</style>
