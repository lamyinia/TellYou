<script setup lang="ts">

</script>

<template>
    <div class="window-drag-bar">
      <span>Tell You - 通彼</span>
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
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
