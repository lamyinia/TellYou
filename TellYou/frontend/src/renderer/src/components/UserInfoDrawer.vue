<script setup lang="ts">
import { ref, watch } from 'vue'
import AvatarUpload from './AvatarUpload.vue'
import { instance } from '../utils/request'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    uid?: string
    name?: string
    avatarUrl?: string
    signature?: string
  }>(),
  { modelValue: false }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'logout'): void
}>()

const open = ref(false)
watch(
  () => props.modelValue,
  (v) => (open.value = v),
  { immediate: true }
)

// 表单数据
const name = ref(props.name || '')
const signature = ref(props.signature || '')
let avatarFile: File | null = null

// 保存状态
const savingAvatar = ref(false)
const savingName = ref(false)
const savingSignature = ref(false)

// 成功状态（用于显示反馈）
const avatarSaved = ref(false)
const nameSaved = ref(false)
const signatureSaved = ref(false)

// 错误状态
const errorMessage = ref('')
const showError = ref(false)

const close = (): void => emit('update:modelValue', false)

// 显示错误信息
const showErrorMessage = (message: string): void => {
  errorMessage.value = message
  showError.value = true
  setTimeout(() => {
    showError.value = false
  }, 3000)
}

const onAvatarUpdated = async (file: File): Promise<void> => {
  avatarFile = file
  // 头像选择后自动保存
  await saveAvatar()
}

const saveAvatar = async (): Promise<void> => {
  if (!avatarFile) return

  savingAvatar.value = true
  try {
    // 使用主进程API上传头像
    const result = await window.electronAPI.uploadAvatar({
      filePath: (avatarFile as any).path || '',
      fileName: avatarFile.name,
      fileSize: avatarFile.size,
      fileSuffix: '.' + avatarFile.name.split('.').pop()?.toLowerCase()
    })
    
    if (result.success) {
      avatarSaved.value = true
      setTimeout(() => {
        avatarSaved.value = false
      }, 2000)
      
      console.log('头像上传成功')
    } else {
      showErrorMessage('头像上传失败')
    }
  } catch (error) {
    console.error('头像上传失败:', error)
    showErrorMessage('头像上传失败，请重试')
  } finally {
    savingAvatar.value = false
  }
}

const saveName = async (): Promise<void> => {
  if (!name.value.trim()) return

  savingName.value = true
  try {
    await updateUserInfo({ name: name.value.trim() })
    
    nameSaved.value = true
    setTimeout(() => {
      nameSaved.value = false
    }, 2000)
    
    console.log('昵称保存成功:', name.value.trim())
  } catch (error) {
    console.error('昵称保存失败:', error)
    showErrorMessage('昵称保存失败，请重试')
  } finally {
    savingName.value = false
  }
}

const saveSignature = async (): Promise<void> => {
  savingSignature.value = true
  try {
    await updateUserInfo({ signature: signature.value.trim() })
    
    signatureSaved.value = true
    setTimeout(() => {
      signatureSaved.value = false
    }, 2000)
    
    console.log('签名保存成功:', signature.value.trim())
  } catch (error) {
    console.error('签名保存失败:', error)
    showErrorMessage('签名保存失败，请重试')
  } finally {
    savingSignature.value = false
  }
}

// API调用函数
const updateUserInfo = async (data: { name?: string; signature?: string }): Promise<any> => {
  try {
    const response = await instance.put('/user/update', data)
    return response.data
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw error
  }
}

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
      <div class="avatar-section">
        <AvatarUpload :upload-on-click="false" :size="72" @updated="(f)=>onAvatarUpdated(f)" />
        <div v-if="savingAvatar" class="saving-indicator">
          <v-progress-circular size="16" indeterminate color="primary" />
        </div>
        <div v-if="avatarSaved" class="success-indicator">
          <v-icon color="success" size="16">mdi-check</v-icon>
        </div>
      </div>
      <div class="uid">UID: {{ props.uid || '-' }}</div>
    </div>
    <div class="form">
      <div class="field-group">
        <v-text-field 
          v-model="name" 
          label="昵称" 
          variant="outlined" 
          hide-details 
          density="comfortable"
          @blur="saveName"
        />
        <v-btn 
          v-if="name.trim() && name !== props.name"
          :loading="savingName"
          :disabled="savingName"
          size="small"
          color="primary"
          variant="text"
          @click="saveName"
        >
          {{ savingName ? '保存中' : '保存' }}
        </v-btn>
        <v-icon v-if="nameSaved" color="success" size="16">mdi-check</v-icon>
      </div>
      
      <div class="field-group">
        <v-textarea 
          v-model="signature" 
          label="签名" 
          rows="2" 
          max-rows="4" 
          variant="outlined" 
          hide-details 
          density="comfortable"
          @blur="saveSignature"
        />
        <v-btn 
          v-if="signature.trim() !== (props.signature || '')"
          :loading="savingSignature"
          :disabled="savingSignature"
          size="small"
          color="primary"
          variant="text"
          @click="saveSignature"
        >
          {{ savingSignature ? '保存中' : '保存' }}
        </v-btn>
        <v-icon v-if="signatureSaved" color="success" size="16">mdi-check</v-icon>
      </div>
    </div>
    <div class="actions">
      <v-btn color="error" variant="tonal" @click="onLogout">退出登录</v-btn>
    </div>
    
    <!-- 错误提示 -->
    <v-snackbar
      v-model="showError"
      :timeout="3000"
      color="error"
      location="top"
    >
      {{ errorMessage }}
    </v-snackbar>
  </v-navigation-drawer>
</template>

<style scoped>
.user-drawer :deep(.v-navigation-drawer__content) { background: rgba(17,23,43,0.98); color: #e8eef7; }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; }
.title { font-weight: 600; letter-spacing: 0.5px; }
.profile { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 12px; }
.avatar-section { position: relative; display: flex; flex-direction: column; align-items: center; }
.saving-indicator, .success-indicator { position: absolute; top: -8px; right: -8px; }
.uid { opacity: 0.8; font-size: 12px; }
.form { display: flex; flex-direction: column; gap: 16px; padding: 0 12px; }
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-group :deep(.v-field) { margin-bottom: 0; }
.actions { display: flex; gap: 10px; padding: 12px; }
</style>
