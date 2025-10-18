<script setup lang="ts">
import { computed, watch } from 'vue'
import { useProfileStore } from '@renderer/status/profile/store'

const props = withDefaults(defineProps<{
  userId: string
  version?: string
  name?: string
  placeholder?: string
  side?: 'left' | 'right'
  truncate?: number
  skeleton?: boolean
}>(), {
  placeholder: '未知',
  side: 'left',
  truncate: 16,
  skeleton: true
})

const profile = useProfileStore()
const ensure = (): void => {
  const ver = props.version ?? '0'
  profile.ensureUser(props.userId, ver, props.placeholder)
}

watch(() => [props.userId, props.version], ensure, { immediate: true })

const entry = computed(() => profile.names[props.userId])
const rawText = computed(() => (entry.value?.name || props.name || props.placeholder))
const text = computed(() => {
  const max = Math.max(0, props.truncate)
  const val = rawText.value
  return val.length > max ? val.slice(0, max) + '…' : val
})
const isLoading = computed(() => profile.loading.has(props.userId) && (!entry.value || !entry.value.name || entry.value.name === props.placeholder))
</script>

<template>
  <div class="nickname" :class="side">
    <span v-if="!skeleton || !isLoading">{{ text }}</span>
    <span v-else class="skeleton"></span>
  </div>
</template>

<style scoped>
.nickname {
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
}
.nickname.right { text-align: right; align-self: flex-end; }
.nickname.left { text-align: left; align-self: flex-start; }
.skeleton {
  display: inline-block;
  width: 64px;
  height: 12px;
  border-radius: 4px;
  background: rgba(255,255,255,0.18);
}
</style>
