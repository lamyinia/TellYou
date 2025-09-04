<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  url?: string
  name?: string
  size?: number
  side?: 'left' | 'right'
}>(), {
  size: 36,
  side: 'left'
})

const initials = computed(() => (props.name || '?').slice(0, 1).toUpperCase())
</script>

<template>
  <div class="avatar" :class="side" :style="{ width: size + 'px', height: size + 'px' }">
    <img v-if="url" :src="url" class="img" alt="avatar" />
    <div v-else class="fallback">{{ initials }}</div>
  </div>
</template>

<style scoped>
.avatar {
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255,255,255,0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fallback {
  color: #fff;
  font-weight: 600;
}
.left { margin-right: 8px; }
.right { margin-left: 8px; }
</style>
