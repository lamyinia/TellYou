<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useAvatarStore } from '@renderer/status/avatar/store'

/**
 * Avatar.vue
 * 1)设计目的：高实时的渲染头像
 * 2) 设计机制：
 *    1.带版本号，不带 url：此时会对比本地版本号，如果需要更新，请求 url，响应式渲染
 *    2.不带版本号，带 url，从 url 提取版本号，对比版本号，如果需要更新，使用改 url(和 1. 的区别是不用请求)，响应式渲染
 *    3.带版本号，带 url，先对比版本号和 url 谁的版本更新新，如果 url 更新，->2，否则 ->1
 * 3) 使用技巧：
 *    1. 版本号如果设置为 0 (无穷小)，请求本地缓存，如果不存在，发起网络请求，拿到最新的头像
 *    2. 版本号如果设置为 9999 (无穷大)，则无论如何都会拿到最新的头像，强制更新
 * @author lanye
 * @date 2025/10/19 13:39
 */


const props = withDefaults(
  defineProps<{
    targetId?: string
    url?: string
    version?: string
    name?: string
    size?: number
    side?: 'left' | 'right'
    contactType ?: number
    showStrategy: string
    showShape: string
    fallbackText?: string
    showLoading?: boolean
  }>(),
  {
    size: 36,
    side: 'left',
    fallbackText: '?',
    contactType: 1,
    showLoading: true,
    showStrategy: 'originalAvatarUrl', // thumbedAvatarUrl
    showShape: 'normal'
  }
)

const avatarStore = useAvatarStore()
const localPath = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const forceUpdate = ref(0)  // 用于强制重新渲染
const initials = computed(() => {
  if (props.fallbackText && props.fallbackText !== '?') {
    return props.fallbackText.slice(0, 1).toUpperCase()
  }
  return (props.name || '?').slice(0, 1).toUpperCase()
})
const avatarSrc = computed(() => {
  if (localPath.value && forceUpdate.value >= 0) {
    const separator = localPath.value.includes('?') ? '&' : '?'
    const timestamp = forceUpdate.value + '_' + Date.now()
    return `${localPath.value}${separator}t=${timestamp}`
  }
  return props.url || null
})
const isLoading = computed(() => loading.value && props.showLoading)

const loadAvatar = async (): Promise<void> => {
  console.info('Avatar.vue:loadAvatar')
  if (!props.targetId) {
    localPath.value = null
    forceUpdate.value++ // 强制重新渲染
    return
  }
  let loadingUrl: string = '' // 要么带版本号查url，要么直接给 url
  if (props.version) {
    // 带版本号查url, 判断 props.version 的版本号是不是比自己存的大更大，如果是更大或者自己没有存过，那么主进程访问 static/json 找 props.url，否则 path 更新为本地存的 localPath
    const checkResult = await avatarStore.seekCache(props.targetId, props.showStrategy, props.version)
    // console.info('debug:checkResult', checkResult)
    if (checkResult.needUpdated) {  // 需要访问 url
      loadingUrl = checkResult.pathResult
    } else {  //  本地版本号更优
      localPath.value = checkResult.pathResult
      forceUpdate.value++ // 强制重新渲染
      return
    }
  } else if (props.url) {  // 直接给 url
    loadingUrl = props.url
  }
  if (loadingUrl === '') {
    localPath.value = null
    forceUpdate.value++
    return
  }

  loading.value = true
  error.value = null
  try {
    console.log('avatar.vue:头像信息:', [props.targetId, props.showStrategy, loadingUrl].join('-'))
    const path = await avatarStore.getAvatar(props.targetId, props.showStrategy, loadingUrl)
    console.log('avatar.vue:渲染文件路径', path)
    localPath.value = path
    forceUpdate.value++ // 强制重新渲染
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load avatar'
    localPath.value = null
    forceUpdate.value++ // 强制重新渲染
  } finally {
    loading.value = false
  }
}
const handleImageError = (): void => {
  localPath.value = null
  error.value = 'Image load failed'
  forceUpdate.value++ // 强制重新渲染
}
watch(
  () => avatarStore.memoryCache.get(props.targetId + '_' +  props.showStrategy),
  async (newCacheItem) => {
    if (newCacheItem && !newCacheItem.loading && newCacheItem.localPath) {
      console.log('avatar.vue:watch:头像缓存更新:', newCacheItem.localPath, '版本:', newCacheItem.version)
      localPath.value = newCacheItem.localPath
      forceUpdate.value ++
      await nextTick()
    }
  },
  { deep: true, immediate: true, flush: 'post' }
)
// 下面的代码不能乱删，不然更新头像没有实时性
watch(
  [() => props.url],
  () => {
    loadAvatar()
  },
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
      :key="forceUpdate"
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
