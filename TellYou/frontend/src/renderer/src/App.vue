<script setup lang="ts">
/* eslint-disable */
import { computed, onMounted, ref } from "vue"
import { useUserStore } from "@main/electron-store/persist/user-store"

const userStore = useUserStore()
const showWindowControls = computed(() => userStore.isLogin)
const isTop = ref(false)
const debugWindowVisible = ref(false)

const onTop = (): void => {
  isTop.value = !isTop.value
  window.electronAPI.send("window-ChangeScreen", 0)
}
const onDebug = (): void => {
  debugWindowVisible.value = !debugWindowVisible.value
  window.electronAPI.send("debug-window-toggle")
}
const onMinimize = (): void =>
  window.electronAPI.send("window-ChangeScreen", 1)
const onScreenChange = (): void =>
  window.electronAPI.send("window-ChangeScreen", 2)
const onClose = (): void => window.electronAPI.send("window-ChangeScreen", 3)
onMounted(async () => {
  await userStore.initStore()
  // setTimeout(async () => {
  //   console.log('开始测试')
  //   await window.electronAPI.invoke("test", 1)
  //   console.log('测试结束')
  // }, 5 * 1000)
})


</script>

<template>
  <div class="window-drag-bar">
    <span> Tell You - 通彼</span>
    <div v-if="showWindowControls" class="window-controls">
      <i
        :class="[
          'iconfont icon-robot',
          debugWindowVisible ? 'debug-active' : '',
        ]"
        title="调试窗口"
        @click="onDebug"
      ></i>
      <i
        :class="['iconfont icon-top', isTop ? 'win-top' : '']"
        title="置顶"
        @click="onTop"
      ></i>
      <i class="iconfont icon-min" title="最小化" @click="onMinimize"></i>
      <i class="iconfont icon-max" title="全屏切换" @click="onScreenChange"></i>
      <i class="iconfont icon-close" title="关闭" @click="onClose"></i>
    </div>
  </div>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
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
  color: #ffb300 !important; /* 高亮为金色 */
  text-shadow: 0 0 6px #ffb30055; /* 柔和光晕 */
  font-weight: bold;
}
.window-controls .iconfont.debug-active {
  color: #2196f3 !important; /* 高亮为蓝色 */
  text-shadow: 0 0 6px #2196f355; /* 柔和光晕 */
  font-weight: bold;
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
