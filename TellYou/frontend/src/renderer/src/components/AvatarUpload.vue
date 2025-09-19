<script setup lang="ts">
import { ref } from 'vue'
import Avatar from './Avatar.vue'

const props = withDefaults(defineProps<{ uploadOnClick?: boolean; size?: number }>(), { uploadOnClick: true, size: 40 })
const emit = defineEmits<{ (e: 'updated', file: File, preview: string, fileInfo?: { filePath: string; fileName: string; fileSize: number; fileSuffix: string; mimeType: string; dataUrl: string }): void }>()
const previewUrl = ref<string>('http://113.44.158.255:32788/lanye/avatar/2025-08/d212eb94b83a476ab23f9d2d62f6e2ef~tplv-p14lwwcsbr-7.jpg')
const uploading = ref(false)

const onPick = async (): Promise<void> => {
  if (uploading.value) return

  try {
    uploading.value = true

    const fileInfo = await window.electronAPI.selectAvatarFile()
    console.log(fileInfo)
    if (!fileInfo) return

    // 使用主进程返回的base64数据URL作为预览
    previewUrl.value = fileInfo.dataUrl

    // 现在可以使用fetch了，因为CSP已经允许data:协议
    const response = await fetch(fileInfo.dataUrl)
    const blob = await response.blob()
    const file = new File([blob], fileInfo.fileName, { type: fileInfo.mimeType })

    // 将文件路径信息附加到File对象上
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
  <div class="info-base" :style="{ width: props.size + 'px', height: props.size + 'px' }" :title="props.uploadOnClick ? '更换头像' : '个人信息'" :class="{ clickable: props.uploadOnClick, uploading: uploading }" @click="props.uploadOnClick ? onPick() : null">
    <Avatar v-if="previewUrl" :user-id="''" :url="previewUrl" :size="props.size" />
    <Avatar v-else :user-id="''" :url="''" :name="'?'" :size="props.size" />
    <button v-if="!props.uploadOnClick" class="edit-btn" type="button" title="更换头像" @click.stop="onPick" :disabled="uploading">
      <i v-if="!uploading" class="iconfont icon-file"></i>
      <i v-else class="iconfont icon-loading"></i>
    </button>
    <div v-if="uploading" class="uploading-overlay">
      <div class="uploading-spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.info-base { display: flex; flex-direction: column; align-items: center; position: relative; }
.clickable { cursor: pointer; }
.clickable.uploading { cursor: not-allowed; opacity: 0.7; }
.edit-btn { position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: #fff; display: flex; align-items: center; justify-content: center; }
.edit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.uploading-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.uploading-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid #fff; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
