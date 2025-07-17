<script setup lang="ts">

</script>

<template>
  <div class="window-drag-bar">
    <!-- 这里可以放LOGO、标题、按钮等 -->
    <span>My App</span>
  </div>
  <router-view />
</template>

<style scoped>
.window-drag-bar {
  height: 32px;
  width: 100%;
  -webkit-app-region: drag;
  background: #222;
  color: #fff;
  display: flex;
  align-items: center;
  padding-left: 12px;
  user-select: none;
}
</style>
