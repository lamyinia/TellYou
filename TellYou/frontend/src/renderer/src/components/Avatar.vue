<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useAvatarStore } from '@renderer/status/avatar/store'

const props = withDefaults(
  defineProps<{
    userId?: string
    url?: string
    version?: string
    name?: string
    size?: number
    side?: 'left' | 'right'
    showStrategy?: string
    showShape?: string
    fallbackText?: string
    showLoading?: boolean
  }>(), {
    size: 36,
    side: 'left',
    fallbackText: '?',
    showLoading: true,
    showStrategy: 'originalAvatarUrl',
    showShape: 'normal'
  }
)

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
  if (!props.userId) {
    localPath.value = null
    return
  }
  let loadingUrl: string = ''  // 要么带版本号查url，要么直接给 url
  if (props.version) {  // 带版本号查url, 判断 props.version 的版本号是不是比自己存的大更大，如果是更大或者自己没有存过，那么主进程访问 static/json 找 props.url，否则 path 更新为本地存的 localPath
    const checkResult = await avatarStore.seekCache(props.userId, props.showStrategy, props.version)
    // console.info('debug:checkResult', checkResult)
    if (checkResult.needUpdated) {
      // 需要访问 url
      loadingUrl = checkResult.pathResult
    } else {
      localPath.value = checkResult.pathResult
      return
    }
  } else if (props.url) {
    // 直接给 url
    loadingUrl = props.url
  }

  if (loadingUrl === '') {
    localPath.value = null
    return
  }

  loading.value = true
  error.value = null
  try {
    console.log('要加载的头像 url', loadingUrl)
    const path = await avatarStore.getAvatar(props.userId, props.showStrategy, loadingUrl)
    console.log('要加载的头像 path', path)
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

watch([() => props.userId, () => props.url, () => props.size],
  () => {loadAvatar()},
  { immediate: true }
)
onMounted(() => {
  loadAvatar()
})
</script>

<template>
  <div class="avatar" :class="side" :style="{ width: size + 'px', height: size + 'px' }">
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
    </div>
    <img
      v-else-if="avatarSrc"
      :src="avatarSrc"
      class="img"
      alt="avatar"
      @error="handleImageError"
    />
    <div v-else class="fallback">{{ initials }}</div>
  </div>
</template>

<style scoped>
.avatar {
  border-radius: 50%;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.12);
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
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.left {
  margin-right: 8px;
}
.right {
  margin-left: 8px;
}
</style>
