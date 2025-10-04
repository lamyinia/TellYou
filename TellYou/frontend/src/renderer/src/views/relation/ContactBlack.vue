<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useBlackStore } from '@renderer/status/black/store'

const open = ref(false)
const blackStore = useBlackStore()

onMounted(() => blackStore.init())
const toggle = (): void => {
  open.value = !open.value
}
</script>

<template>
  <v-btn
    class="fab-sub fab-black"
    color="#b8c5ed"
    size="large"
    :ripple="true"
    rounded="xl"
    @click="toggle"
  >
    <v-icon icon="mdi-account-cancel-outline" size="22"></v-icon>
  </v-btn>

  <transition name="fade">
    <div v-if="open" class="panel-wrap" @click.self="toggle">
      <div class="panel" @click.stop>
        <div class="panel-inner">黑名单管理（占位，待接入）</div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fab-sub {
  position: fixed;
  left: 10px;
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  z-index: 49; /* 低于主铃铛 */
}
.fab-black {
  top: 170px;
}

.panel-wrap {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 39;
}
.panel {
  position: absolute;
  top: 30px;
  left: 80px;
  right: 16px;
  bottom: 16px;
}
.panel-inner {
  max-width: 960px;
  width: 100%;
  height: 100%;
  background: rgba(10, 12, 32, 0.96);
  border-radius: 16px;
  padding: 16px;
  color: #e0e6f0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
