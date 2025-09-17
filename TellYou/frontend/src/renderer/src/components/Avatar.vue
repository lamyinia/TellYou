<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useAvatarStore } from '@renderer/status/avatar/store'

const props = withDefaults(defineProps<{
  userId?: string
  url?: string
  name?: string
  size?: number
  side?: 'left' | 'right'
  fallbackText?: string
  showLoading?: boolean
}>(), {
  size: 36,
  side: 'left',
  fallbackText: '?',
  showLoading: true
})

const avatarStore = useAvatarStore()
const localPath = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const initials = computed(() => {
  if (props.fallbackText && props.fallbackText !== '?') {
    return props.fallbackText.slice(0, 1).toUpperCase()
  }
  return (props.name || '?').slice(0, 1).toUpperCase()
})

const avatarSrc = computed(() => {
  if (localPath.value) return localPath.value
  return props.url || null
})

const isLoading = computed(() => loading.value && props.showLoading)

const loadAvatar = async () => {
  if (!props.userId || !props.url) {
    localPath.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    const path = await avatarStore.getAvatar(props.userId, props.url, props.size)
    localPath.value = path
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load avatar'
    localPath.value = null
  } finally {
    loading.value = false
  }
}

const handleImageError = () => {
  localPath.value = null
  error.value = 'Image load failed'
}

// 监听props变化
watch([() => props.userId, () => props.url, () => props.size], () => {
  loadAvatar()
}, { immediate: true })

onMounted(() => {
  loadAvatar()
})
</script>

<template>
  <div class="avatar" :class="side" :style="{ width: size + 'px', height: size + 'px' }">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
    </div>

    <!-- 头像图片 -->
    <img
      v-else-if="avatarSrc"
      :src="avatarSrc"
      class="img"
      alt="avatar"
      @error="handleImageError"
    />

    <!-- 回退显示 -->
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
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.left { margin-right: 8px; }
.right { margin-left: 8px; }
</style>
