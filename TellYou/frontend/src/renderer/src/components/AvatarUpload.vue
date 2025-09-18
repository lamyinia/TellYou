<script setup lang="ts">
import { ref } from 'vue'
import Avatar from './Avatar.vue'

const props = withDefaults(defineProps<{ uploadOnClick?: boolean; size?: number }>(), { uploadOnClick: true, size: 40 })
const emit = defineEmits<{ (e: 'updated', file: File, preview: string): void }>()
const inputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string>('http://113.44.158.255:32788/lanye/avatar/2025-08/d212eb94b83a476ab23f9d2d62f6e2ef~tplv-p14lwwcsbr-7.jpg')

const onPick = (): void => { inputRef.value?.click() }

const onChange = (e: Event): void => {
  const t = e.target as HTMLInputElement
  const file = t.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  previewUrl.value = url
  emit('updated', file, url)
}
</script>

<template>
  <div class="info-base" :style="{ width: props.size + 'px', height: props.size + 'px' }" :title="props.uploadOnClick ? '更换头像' : '个人信息'" :class="{ clickable: props.uploadOnClick }" @click="props.uploadOnClick ? onPick() : null">
    <Avatar v-if="previewUrl" :user-id="''" :url="previewUrl" :size="props.size" />
    <Avatar v-else :user-id="''" :url="''" :name="'?'" :size="props.size" />
    <button v-if="!props.uploadOnClick" class="edit-btn" type="button" title="更换头像" @click.stop="onPick">
      <i class="iconfont icon-file"></i>
    </button>
    <input ref="inputRef" type="file" accept="image/*" class="hidden-input" @change="onChange" />
  </div>
</template>

<style scoped>
.info-base { display: flex; flex-direction: column; align-items: center; position: relative; }
.hidden-input { display: none; }
.placeholder { display: none; }
.clickable { cursor: pointer; }
.edit-btn { position: absolute; right: -6px; bottom: -6px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: #fff; display: flex; align-items: center; justify-content: center; }
</style>
