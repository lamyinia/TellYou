<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getUserStore } from '../../main/stores/GlobalStore'

const userStore = getUserStore()
const showWindowControls = computed(() => userStore.isLogin)
const isTop = ref(false)

const onTop = (): void => {
  isTop.value = !isTop.value
  window.ipcRenderer.send('window-ChangeScreen', 0)
}
const onMinimize = (): void => window.ipcRenderer.send('window-ChangeScreen', 1)
const onScreenChange = ():void => window.ipcRenderer.send('window-ChangeScreen', 2)
const onClose = (): void => window.ipcRenderer.send('window-ChangeScreen', 3)
onMounted(async () => {
  await userStore.initStore()
})

</script>

<template>
    <div class="window-drag-bar">
      <span> Tell You - 通彼</span>
      <div v-if="showWindowControls" class="window-controls">
        <i :class="['iconfont icon-top', isTop ? 'win-top' : '']" title="置顶" @click="onTop"></i>
        <i class="iconfont icon-min" title="最小化" @click="onMinimize"></i>
        <i class="iconfont icon-max" title="全屏切换" @click="onScreenChange"></i>
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
.window-controls .iconfont.win-top {
  color: #ffb300 !important;      /* 高亮为金色 */
  text-shadow: 0 0 6px #ffb30055; /* 柔和光晕 */
  font-weight: bold;
}

</style>
