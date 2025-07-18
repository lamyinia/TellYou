<script setup lang="ts">
</script>
<style scoped>
.sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  height: 100vh;
  background: #111827 !important;
  border-left: 1px solid #111827;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
</style>

<template>
  <div class="sidebar">
    <v-list nav dense>
      <v-list-item link>
        <v-icon color="green">mdi-message</v-icon>
      </v-list-item>
    </v-list>
  </div>
</template>
