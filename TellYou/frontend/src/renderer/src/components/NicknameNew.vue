<script setup lang="ts">
/* eslint-disable */
import { computed, ref, watch, onMounted } from "vue";
import { useProfileStore } from "@renderer/stores/profile-store";

/**
 * 新的Nickname组件
 * 使用统一的ProfileStore，支持用户和群组昵称
 * 
 * 特性：
 * 1. 统一的API调用
 * 2. 支持用户和群组
 * 3. 自动事件监听和缓存更新
 * 4. 文本截断和省略号
 * 5. 加载状态显示
 * 
 * @author lanye
 * @since 2025/10/29
 */

interface Props {
  targetId?: string
  contactType?: number  // 1=用户, 2=群组
  placeholder?: string
  maxLength?: number
  showLoading?: boolean
  clickable?: boolean
  truncate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  contactType: 1,
  placeholder: '未知',
  maxLength: 20,
  showLoading: true,
  clickable: false,
  truncate: true
})

const emit = defineEmits<{
  click: []
  load: [nickname: string]
  error: [error: string]
}>()

const profileStore = useProfileStore()

// 响应式状态
const nickname = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)

// 计算属性
const isLoading = computed(() => {
  return loading.value || profileStore.loadingNicknames.has(getCacheKey())
})

const fullNickname = computed(() => {
  return nickname.value || props.placeholder
})

const displayNickname = computed(() => {
  const name = nickname.value || props.placeholder
  
  if (props.truncate && name.length > props.maxLength) {
    return name.substring(0, props.maxLength) + '...'
  }
  
  return name
})

const nicknameClasses = computed(() => {
  return [
    'nickname',
    {
      'nickname-loading': isLoading.value,
      'nickname-clickable': props.clickable,
      'nickname-error': error.value,
      'nickname-placeholder': !nickname.value
    }
  ]
})

// 工具方法
const getCacheKey = (): string => {
  return `${props.targetId}_${props.contactType}_nickname`
}

// 加载昵称
const loadNickname = async (): Promise<void> => {
  if (!props.targetId) {
    nickname.value = ''
    return
  }

  try {
    loading.value = true
    error.value = null

    const name = await profileStore.getNickname(
      props.targetId,
      props.contactType,
      props.placeholder
    )

    nickname.value = name === props.placeholder ? '' : name
    
    if (name && name !== props.placeholder) {
      emit('load', name)
      console.info(`Nickname: 加载成功 ${props.targetId} -> ${name}`)
    } else {
      console.warn(`Nickname: 使用占位符 ${props.targetId} -> ${props.placeholder}`)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to load nickname'
    error.value = errorMsg
    nickname.value = ''
    emit('error', errorMsg)
    console.error('Nickname: 加载错误', err)
  } finally {
    loading.value = false
  }
}

// 监听属性变化
watch(
  () => [props.targetId, props.contactType],
  () => {
    if (props.targetId) {
      loadNickname()
    } else {
      nickname.value = ''
    }
  },
  { immediate: true }
)

// 监听缓存更新
watch(
  () => profileStore.profileCache.get(`${props.targetId}_${props.contactType}`)?.nickname,
  (newNickname) => {
    if (newNickname && newNickname !== nickname.value) {
      nickname.value = newNickname
      emit('load', newNickname)
      console.info(`Nickname: 缓存更新 ${props.targetId} -> ${newNickname}`)
    }
  }
)

// 组件挂载时加载
onMounted(() => {
  if (props.targetId) {
    loadNickname()
  }
})
</script>

<template>
  <span 
    :class="nicknameClasses"
    :title="fullNickname"
    @click="$emit('click')"
  >
    <!-- 加载状态 -->
    <span v-if="isLoading && showLoading" class="nickname-loading">
      <span class="loading-dots">...</span>
    </span>
    
    <!-- 昵称文本 -->
    <span v-else class="nickname-text">
      {{ displayNickname }}
    </span>
  </span>
</template>

<style scoped>
.nickname {
  display: inline-block;
  transition: all 0.2s ease;
}

.nickname-clickable {
  cursor: pointer;
}

.nickname-clickable:hover {
  opacity: 0.8;
}

.nickname-loading {
  color: #999;
  font-style: italic;
}

.nickname-error {
  color: #c62828;
}

.nickname-placeholder {
  color: #999;
  font-style: italic;
}

.nickname-text {
  word-break: break-all;
  line-height: 1.4;
}

.loading-dots {
  animation: loading-dots 1.5s infinite;
}

@keyframes loading-dots {
  0%, 20% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  80%, 100% {
    opacity: 0;
  }
}

/* 不同上下文的样式 */
.nickname.in-chat {
  font-weight: 500;
}

.nickname.in-list {
  font-size: 14px;
}

.nickname.in-header {
  font-size: 16px;
  font-weight: 600;
}

/* 群组昵称样式 */
.nickname[data-contact-type="2"] {
  color: #1976d2;
}

/* 用户昵称样式 */
.nickname[data-contact-type="1"] {
  color: #333;
}
</style>
