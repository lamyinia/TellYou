<script setup lang="ts">
import { ref, watch } from 'vue'
import AvatarUpload from './AvatarUpload.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  uid?: string
  name?: string
  avatarUrl?: string
  signature?: string
}>(), { modelValue: false })

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'save', payload: { uid?: string; name?: string; avatarFile?: File | null; signature?: string }): void
  (e: 'logout'): void
}>()

const open = ref(false)
watch(() => props.modelValue, v => open.value = v, { immediate: true })
const name = ref(props.name || '')
const signature = ref(props.signature || '')
let avatarFile: File | null = null

const close = (): void => emit('update:modelValue', false)
const onAvatarUpdated = (file: File): void => { avatarFile = file }
const onSave = (): void => emit('save', { uid: props.uid, name: name.value, signature: signature.value, avatarFile })
const onLogout = (): void => emit('logout')
</script>

<template>
  <v-navigation-drawer
    v-model="open"
    location="right"
    width="320"
    temporary
    class="user-drawer"
  >
    <div class="drawer-header">
      <div class="title">个人信息</div>
      <v-btn icon variant="text" @click="close"><v-icon>mdi-close</v-icon></v-btn>
    </div>
    <div class="profile">
      <AvatarUpload :upload-on-click="false" :size="72" @updated="(f)=>onAvatarUpdated(f)" />
      <div class="uid">UID: {{ props.uid || '-' }}</div>
    </div>
    <div class="form">
      <v-text-field v-model="name" label="昵称" variant="outlined" hide-details density="comfortable" />
      <v-textarea v-model="signature" label="签名" rows="2" max-rows="4" variant="outlined" hide-details density="comfortable" />
    </div>
    <div class="actions">
      <v-btn color="primary" @click="onSave">保存</v-btn>
      <v-btn color="error" variant="tonal" @click="onLogout">退出登录</v-btn>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.user-drawer :deep(.v-navigation-drawer__content) { background: rgba(17,23,43,0.98); color: #e8eef7; }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; }
.title { font-weight: 600; letter-spacing: 0.5px; }
.profile { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 12px; }
.uid { opacity: 0.8; font-size: 12px; }
.form { display: flex; flex-direction: column; gap: 10px; padding: 0 12px; }
.actions { display: flex; gap: 10px; padding: 12px; }
</style>
