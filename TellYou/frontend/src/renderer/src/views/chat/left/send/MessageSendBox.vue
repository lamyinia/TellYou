<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import MediaSendBox from '@renderer/views/chat/left/send/MediaSendBox.vue'
import VoicePreview from '@renderer/views/chat/left/send/VoicePreview.vue'
import { Session } from '@shared/types/session'
import { useUserStore } from '@main/electron-store/persist/user-store'


const props = defineProps<{ currentContact: Session | null }>()
const emit = defineEmits<{ (e: 'goBottom'): void }>()

const message = ref('')
const disabled = computed(() => !message.value || !props.currentContact)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const showMediaBox = ref(false)
const isRecording = ref(false)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
const audioDuration = ref(0)

const showVoicePreview = ref(false)
const previewAudioBlob = ref<Blob | null>(null)
const previewDuration = ref(0)
const error = ref('')

const MIN_RECORDING_DURATION = 1 // 最短录制时长（秒）
const MAX_RECORDING_DURATION = 60 // 最长录制时长（秒）

const adjustHeight = (): void => {
  if (!textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  const scrollHeight = textareaRef.value.scrollHeight
  const maxHeight = 5 * 1.6 * 14 + 20 // 5行 * 行高 * 字体大小 + 内边距
  textareaRef.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}
const sendMessage = async (): Promise<void> => {
  const userStore = useUserStore()
  const fromUId = userStore.myId
  const current = props.currentContact
  if (!fromUId || !current || !message.value) return

  const payload = {
    fromUId,
    toUserId: current.contactId,
    sessionId: current.sessionId,
    content: message.value
  }
  const success = await window.electronAPI.wsSend(payload)
  if (success) {
    message.value = ''
    await nextTick()
    emit('goBottom')
  }
}
const onKeydown = async (e: KeyboardEvent): Promise<void> => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    await sendMessage()
  }
}
const toggleMediaBox = (): void => {
  showMediaBox.value = !showMediaBox.value
}
const handleMediaSent = (): void => {
  showMediaBox.value = false
  emit('goBottom')
}

const startRecording = async (): Promise<void> => {
  try {
    console.log('开始录制语音...')
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      error.value = '您的浏览器不支持音频录制功能'
      return
    }
    const audioConfig = await window.electronAPI.getAudioStream({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1,
        sampleSize: 16
      }
    })

    if (!audioConfig.success) {
      throw new Error(audioConfig.error || '获取音频配置失败')
    }
    console.log('Electron音频配置获取成功:', audioConfig)
    // 尝试获取音频流，增加权限处理
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia(audioConfig.constraints)
    } catch (permissionError: any) {
      console.error('麦克风权限被拒绝:', permissionError)
      if (permissionError?.name === 'NotAllowedError') {
        error.value = '请允许访问麦克风权限后重试'
      } else if (permissionError?.name === 'NotFoundError') {
        error.value = '未找到可用的麦克风设备'
      } else {
        error.value = '无法访问麦克风，请检查设备和权限设置'
      }
      return
    }
    const supportedMimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8,opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ]
    let mimeType = ''
    for (const type of supportedMimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type
        console.log('选择音频格式:', mimeType)
        break
      }
    }
    if (!mimeType) {
      console.warn('未找到支持的音频格式，使用默认格式')
    }
    mediaRecorder.value = new MediaRecorder(stream, mimeType ? { mimeType } : {})
    audioChunks.value = []
    audioDuration.value = 0
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.value.push(event.data)
      }
    }
    mediaRecorder.value.onstop = () => {
      const audioBlob = new Blob(audioChunks.value, {
        type: mimeType || 'audio/webm'
      })
      console.log('=== 录制完成 ===')
      console.log('音频格式:', mimeType || 'default')
      console.log('Blob大小:', audioBlob.size, 'bytes')
      console.log('Blob类型:', audioBlob.type)
      console.log('音频块数量:', audioChunks.value.length)
      
      // 分析第一个音频块
      if (audioChunks.value.length > 0) {
        console.log('第一个音频块大小:', audioChunks.value[0].size, 'bytes')
        console.log('第一个音频块类型:', audioChunks.value[0].type)
      }
      
      handleAudioRecorded(audioBlob)
    }

    mediaRecorder.value.start()
    isRecording.value = true

    const timer = setInterval(() => {
      if (isRecording.value) {
        audioDuration.value++
      } else {
        clearInterval(timer)
      }
    }, 1000)
  } catch (err) {
    console.error('无法访问麦克风:', err)
  }
}

const stopRecording = (): void => {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    mediaRecorder.value.stream.getTracks().forEach((track) => track.stop())
  }
}

const handleAudioRecorded = async (audioBlob: Blob): Promise<void> => {
  if (audioDuration.value < MIN_RECORDING_DURATION) {
    error.value = `录制时间太短，至少需要 ${MIN_RECORDING_DURATION} 秒`
    return
  }
  if (audioDuration.value > MAX_RECORDING_DURATION) {
    error.value = `录制时间太长，最多 ${MAX_RECORDING_DURATION} 秒`
    return
  }
  error.value = ''
  previewAudioBlob.value = audioBlob
  previewDuration.value = audioDuration.value
  showVoicePreview.value = true

  console.log('Audio recorded:', audioBlob, 'Duration:', audioDuration.value)
  console.log('语音预览状态设置:', {
    previewAudioBlob: !!previewAudioBlob.value,
    previewDuration: previewDuration.value,
    showVoicePreview: showVoicePreview.value,
    blobSize: audioBlob.size,
    blobType: audioBlob.type
  })
}

// 发送语音
const sendVoice = async (): Promise<void> => {
  if (!previewAudioBlob.value) return
  try {
    await window.electronAPI.invoke('test', await previewAudioBlob.value.arrayBuffer())
    // 将Blob转换为ArrayBuffer以便传输
    // const arrayBuffer = await previewAudioBlob.value.arrayBuffer()
    // const uint8Array = new Uint8Array(arrayBuffer)
    // const userStore = useUserStore()
    // const fromUId = userStore.myId
    // const current = props.currentContact
    // if (!fromUId || !current) {
    //   error.value = '发送失败：用户信息或联系人信息缺失'
    //   return
    // }
    // const voicePayload = {
    //   fromUId,
    //   toUserId: current.contactId,
    //   sessionId: current.sessionId,
    //   messageType: 'voice',
    //   voiceData: Array.from(uint8Array), // 转换为普通数组以便序列化
    //   duration: previewDuration.value,
    //   mimeType: previewAudioBlob.value.type || 'audio/webm'
    // }
    // console.log('发送语音消息:', {
    //   size: previewAudioBlob.value.size,
    //   duration: previewDuration.value,
    //   type: previewAudioBlob.value.type
    // })
    //
    // // 通过WebSocket发送语音消息
    // const success = await window.electronAPI.wsSend(voicePayload)
    //
    // if (success) {
    //   clearVoicePreview()
    //   emit('goBottom')
    // } else {
    //   error.value = '语音发送失败，请重试'
    // }
  } catch (err) {
    error.value = '语音发送失败'
    console.error('语音发送失败:', err)
  }
}
const cancelVoice = (): void => {
  clearVoicePreview()
}
const clearVoicePreview = (): void => {
  showVoicePreview.value = false
  previewAudioBlob.value = null
  previewDuration.value = 0
}

watch(
  message,
  () => {
    nextTick(() => adjustHeight())
  },
  { immediate: true }
)
</script>

<template>
  <div class="sendbox-container">
    <!-- 语音预览组件 -->
    <VoicePreview
      v-if="previewAudioBlob"
      :audio-blob="previewAudioBlob"
      :duration="previewDuration"
      :visible="showVoicePreview"
      @send="sendVoice"
      @cancel="cancelVoice"
    />
    <MediaSendBox v-if="showMediaBox" :current-contact="currentContact" @sent="handleMediaSent" />
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div class="sendbox">
      <v-btn icon class="icon-btn" @click="toggleMediaBox">
        <v-icon>mdi-paperclip</v-icon>
      </v-btn>
      <v-btn
        icon
        class="icon-btn voice-btn"
        :class="{ recording: isRecording }"
        @mousedown="startRecording"
        @mouseup="stopRecording"
        @mouseleave="stopRecording"
      >
        <v-icon>mdi-microphone</v-icon>
      </v-btn>
      <v-btn icon class="icon-btn"><v-icon>mdi-emoticon-outline</v-icon></v-btn>

      <div class="input-wrap">
        <textarea
          ref="textareaRef"
          v-model="message"
          class="input"
          rows="1"
          placeholder="输入消息..."
          @keydown="onKeydown"
          @input="adjustHeight"
        />
      </div>

      <v-btn color="primary" :disabled="disabled" @click="sendMessage" class="send-btn">
        <v-icon>mdi-send</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.sendbox-container {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
}


/* 错误提示样式 */
.error-message {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin: 0 24px 8px 24px;
  padding: 12px 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  color: #f44336;
  font-size: 14px;
  backdrop-filter: blur(10px);
  z-index: 5;
}

.sendbox {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 24px 20px 24px;
  background: linear-gradient(0deg, rgba(13, 19, 61, 0.96) 90%, rgba(13, 19, 61, 0) 100%);
  border-radius: 0 0 0 18px;
  min-height: 88px;
}
.icon-btn {
  background: #fff;
  color: #1a237e;
  margin-right: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
}
.input-wrap {
  flex: 1;
  min-width: 0;
  margin: 0 10px;
  border-radius: 20px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(31, 38, 135, 0.12);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}
.input-wrap:focus-within {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.15),
    0 2px 8px rgba(31, 38, 135, 0.12),
    0 0 0 2px rgba(255, 255, 255, 0.08);
}
.input {
  width: 100%;
  max-height: 96px;
  min-height: 20px;
  line-height: 1.6;
  font-size: 14px;
  color: #fff;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: height 0.2s ease-out;
  overflow-y: auto;
}
.send-btn {
  border-radius: 20px;
  height: 44px;
  min-width: 44px;
  box-shadow: 0 2px 8px rgba(31, 38, 135, 0.18);
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    opacity 0.2s;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(31, 38, 135, 0.25);
}
.send-btn:disabled {
  opacity: 0.5;
  transform: none;
  box-shadow: 0 2px 8px rgba(31, 38, 135, 0.18);
}

.voice-btn.recording {
  background: linear-gradient(135deg, #f44336, #d32f2f) !important;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
