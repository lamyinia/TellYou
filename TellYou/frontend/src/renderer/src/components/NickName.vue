<script setup lang="ts">
/* eslint-disable */
import { computed, ref, watch, onMounted } from "vue";
import { useProfileStore } from "@renderer/status/profile/profile-store";

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
  targetId: string
  contactType?: number  // 1=用户, 2=群组
  nicknameVersion?: string
  placeholder?: string
  maxLength?: number
  showLoading?: boolean
  clickable?: boolean
  truncate?: boolean
  side?: "left" | "right"  // 兼容旧版side属性
}

const props = withDefaults(defineProps<Props>(), {
  contactType: 1,
  nicknameVersion: '999999',
  placeholder: '未知',
  maxLength: 20,
  showLoading: true,
  clickable: false,
  truncate: true
})

const profileStore = useProfileStore()
const nickname = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const getCacheKey = (): string => {
  return `${props.targetId}_${props.contactType}`
}

const isLoading = computed(() => {
  return loading.value || profileStore.nicknameTrigger.has(getCacheKey())
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
  const classes = ['nickname', {
      'nickname-loading': isLoading.value,
      'nickname-clickable': props.clickable,
      'nickname-error': error.value,
      'nickname-placeholder': !nickname.value
    }
  ]

  // 添加side样式类
  if (props.side) {
    classes.push(props.side)
  }

  return classes
})

const loadNickname = async (): Promise<void> => {
  if (!props.targetId) {
    nickname.value = ''
    return
  }
  try {
    loading.value = true
    error.value = null

    const name = await profileStore.getNickname(props.targetId, props.contactType, props.nicknameVersion, props.placeholder)
    nickname.value = name === props.placeholder ? '' : name

    if (name && name !== props.placeholder) {
      console.info(`Nickname: 加载成功 ${props.targetId} -> ${name}`)
    } else {
      console.warn(`Nickname: 使用占位符 ${props.targetId} -> ${props.placeholder}`)
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to load nickname'
    error.value = errorMsg
    nickname.value = ''
    console.error('Nickname: 加载错误', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => profileStore.nicknameTrigger.get(getCacheKey()),
  (newNickname) => {
    if (newNickname && newNickname !== nickname.value) {
      nickname.value = newNickname
      console.info(`Nickname: 缓存更新 ${props.targetId} -> ${newNickname}`)
    }
  }
)
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
    <span v-if="isLoading && showLoading" class="nickname-loading">
      <span class="loading-dots">...</span>
    </span>

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

/* 兼容旧版side样式 */
.nickname.left {
  font-size: 12px;
  opacity: 0.78;
  line-height: 16px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  margin-bottom: 2px;
  display: inline-block;
  align-self: flex-start;
  text-align: left;
}

.nickname.right {
  font-size: 12px;
  opacity: 0.78;
  line-height: 16px;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  margin-bottom: 2px;
  display: inline-block;
  align-self: flex-end;
  text-align: right;
}
</style>
