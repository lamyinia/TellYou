<script setup lang="ts">
/* eslint-disable */

import { computed, ref, watch, onMounted } from "vue";
import { useProfileStore } from "@renderer/status/profile/profile-store";

/**
 * 新的Avatar组件
 * 使用统一的ProfileStore，支持用户和群组头像
 *
 * 特性：
 * 1. 统一的API调用
 * 2. 支持用户和群组
 * 3. 自动事件监听和缓存更新
 * 4. 简化的加载逻辑
 *
 * @author lanye
 * @since 2025/10/29
 */

interface Props {
  targetId?: string
  contactType?: number  // 1=用户, 2=群组
  strategy?: string     // 'originalAvatarUrl' | 'thumbedAvatarUrl'
  version?: string
  size?: number
  shape?: 'circle' | 'square' | 'rounded'
  fallbackText?: string
  showLoading?: boolean
  clickable?: boolean
  side?: 'left' | 'right'  // 兼容旧的side属性
}

const props = withDefaults(defineProps<Props>(), {
  contactType: 1,
  strategy: 'thumbedAvatarUrl',
  size: 36,
  shape: 'circle',
  fallbackText: '?',
  showLoading: true,
  clickable: false
})

const emit = defineEmits<{
  click: []
  load: []
  error: [error: string]
}>()

const profileStore = useProfileStore()
const avatarPath = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const imageLoaded = ref(false)
const getCacheKey = (): string => {
  return `${props.targetId}_${props.contactType}_${props.strategy}`
}
const initials = computed(() => {
  if (props.fallbackText && props.fallbackText !== '?') {
    return props.fallbackText.slice(0, 1).toUpperCase()
  }
  return '?'
})

const avatarSrc = computed(() => {
  if (avatarPath.value && imageLoaded.value) {
    const separator = avatarPath.value.includes('?') ? '&' : '?'
    return `${avatarPath.value}${separator}t=${Date.now()}`
  }
  return avatarPath.value
})
const isLoading = computed(() => {
  return loading.value
})
const avatarClasses = computed(() => {
  const classes = [
    'avatar',
    `avatar-${props.shape}`,
    {
      'avatar-loading': isLoading.value,
      'avatar-clickable': props.clickable,
      'avatar-error': error.value
    }
  ]
  if (props.side) {
    classes.push(props.side)
  }

  return classes
})
const avatarStyles = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`,
    fontSize: `${props.size * 0.4}px`
  }
})

const loadAvatar = async (): Promise<void> => {
  if (!props.targetId) {
    avatarPath.value = null
    return
  }

  try {
    loading.value = true
    error.value = null
    imageLoaded.value = false
    const path = await profileStore.getAvatarPath(props.targetId, props.strategy, props.contactType, props.version)
    avatarPath.value = path
    if (path) {
      console.info(`Avatar: 加载成功 ${props.targetId} -> ${path}`)
    } else {
      console.warn(`Avatar: 加载失败 ${props.targetId}`)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to load avatar'
    error.value = errorMsg
    emit('error', errorMsg)
    console.error('Avatar: 加载错误', err)
  } finally {
    loading.value = false
  }
}

const handleImageLoad = (): void => {
  imageLoaded.value = true
  error.value = null
  emit('load')
}

const handleImageError = (): void => {
  imageLoaded.value = false
  error.value = 'Image load failed'
  avatarPath.value = null
  emit('error', 'Image load failed')
}

watch(
  () => [props.targetId, props.contactType, props.strategy, props.version],
  () => {
    if (props.targetId) {
      loadAvatar()
    }
  },
  { immediate: true }
)

watch(
  () => profileStore.avatarTrigger.get(getCacheKey()),
  (newPath) => {
    if (newPath && newPath !== avatarPath.value) {
      avatarPath.value = newPath
      imageLoaded.value = false // 重新加载图片
      console.info(`Avatar: 缓存更新 ${props.targetId} -> ${newPath}`)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.targetId) {
    loadAvatar()
  }
})

</script>

<template>
  <div
    :class="avatarClasses"
    :style="avatarStyles"
    @click="$emit('click')"
  >
    <div v-if="isLoading && showLoading" class="avatar-loading">
      <div class="loading-spinner"></div>
    </div>

    <img
      v-else-if="avatarSrc"
      :src="avatarSrc"
      :alt="fallbackText"
      class="avatar-image"
      @error="handleImageError"
      @load="handleImageLoad"
    />

    <div v-else class="avatar-fallback">
      {{ initials }}
    </div>
  </div>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #666;
  font-weight: 500;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
}

.avatar-circle {
  border-radius: 50%;
}

.avatar-square {
  border-radius: 0;
}

.avatar-rounded {
  border-radius: 8px;
}

.avatar-clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.avatar-clickable:hover {
  transform: scale(1.05);
}

.avatar-loading {
  background-color: #f5f5f5;
}

.avatar-error {
  background-color: #ffebee;
  color: #c62828;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.avatar-loading .loading-spinner {
  width: 60%;
  height: 60%;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 不同尺寸的优化 */
.avatar[style*="width: 24px"] .avatar-fallback {
  font-size: 10px;
}

.avatar[style*="width: 32px"] .avatar-fallback {
  font-size: 12px;
}

.avatar[style*="width: 48px"] .avatar-fallback {
  font-size: 18px;
}

.avatar[style*="width: 64px"] .avatar-fallback {
  font-size: 24px;
}

/* 兼容旧的side属性样式 */
.left {
  margin-right: 8px;
}

.right {
  margin-left: 8px;
}
</style>
