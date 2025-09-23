<script setup lang="ts">
import { ref, computed } from 'vue'
import Avatar from './Avatar.vue'
import { useUserStore } from '@main/electron-store/persist/user-store'

const props = withDefaults(
  defineProps<{ uploadOnClick?: boolean; size?: number; disabled?: boolean }>(),
  { uploadOnClick: true, size: 40, disabled: false }
)
const emit = defineEmits<{
  (
    e: 'updated',
    file: File,
    preview: string,
    fileInfo?: {
      filePath: string
      fileName: string
      fileSize: number
      fileSuffix: string
      mimeType: string
      dataUrl: string
    }
  ): void
}>()

const userStore = useUserStore()
const uploading = ref(false)

// 从 userStore 获取头像 URL
const previewUrl = computed(() => userStore.avatarUrl || '')

const onPick = async (): Promise<void> => {
  if (uploading.value || props.disabled) return
  try {
    uploading.value = true
    const fileInfo = await window.electronAPI.selectAvatarFile()
    console.log('拿到的文件日志', fileInfo)
    if (!fileInfo) return

    const response = await fetch(fileInfo.dataUrl)
    const blob = await response.blob()
    const file = new File([blob], fileInfo.fileName, { type: fileInfo.mimeType })

    ;(file as File & { path?: string }).path = fileInfo.filePath

    emit('updated', file, fileInfo.dataUrl, fileInfo)
  } catch (error) {
    console.error('选择文件失败:', error)
    // 这里可以显示错误提示
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div
    class="info-base"
    :style="{ width: props.size + 'px', height: props.size + 'px' }"
    :title="props.uploadOnClick ? '更换头像' : '个人信息'"
    :class="{
      clickable: props.uploadOnClick && !props.disabled,
      uploading: uploading,
      disabled: props.disabled
    }"
    @click="props.uploadOnClick && !props.disabled ? onPick() : null"
  >
    <Avatar v-if="previewUrl" :user-id="userStore.myId" :url="previewUrl" :size="props.size" />
    <Avatar v-else :user-id="userStore.myId" :url="''" :name="'?'" :size="props.size" />
    <button
      v-if="!props.uploadOnClick && !props.disabled"
      class="edit-btn"
      type="button"
      title="更换头像"
      :disabled="uploading"
      @click.stop="onPick"
    >
      <i v-if="!uploading" class="iconfont icon-file"></i>
      <i v-else class="iconfont icon-loading"></i>
    </button>
    <div v-if="uploading" class="uploading-overlay">
      <div class="uploading-spinner"></div>
    </div>
    <div v-if="props.disabled" class="disabled-overlay">
      <i class="iconfont icon-lock"></i>
    </div>
  </div>
</template>

<style scoped>
.info-base {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.clickable {
  cursor: pointer;
}
.clickable.uploading {
  cursor: not-allowed;
  opacity: 0.7;
}
.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.edit-btn {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.edit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.uploading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.uploading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.disabled-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f44336;
  font-size: 16px;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
