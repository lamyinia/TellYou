<script setup lang="ts">
/* eslint-disable */

import { ref, onMounted, onUnmounted, nextTick } from "vue"

interface Props {
  audioBlob: Blob,
  duration: number,
  visible: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: "send"): void, (e: "cancel"): void }>()

const isPlaying = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const audioUrl = ref<string>("")

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const togglePlay = async (): Promise<void> => {
  console.log("播放控制被触发，当前状态:", {
    hasAudioElement: !!audioElement.value,
    hasAudioUrl: !!audioUrl.value,
    isPlaying: isPlaying.value,
    audioElementSrc: audioElement.value?.src,
    audioElementReadyState: audioElement.value?.readyState,
    audioElementReady: audioElement.value?.readyState,
    audioElementError: audioElement.value?.error,
  })

  if (!audioElement.value) {
    console.error("音频元素不可用")
    return
  }

  try {
    if (isPlaying.value) {
      audioElement.value.pause();
    } else {
      if (!audioUrl.value || audioElement.value.error) {
        console.log("重新创建音频URL，错误信息:", audioElement.value.error);
        if (audioUrl.value) {
          URL.revokeObjectURL(audioUrl.value);
        }
        try {
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onload = () => {
              audioUrl.value = reader.result as string;
              if (audioElement.value) {
                audioElement.value.src = audioUrl.value;
              }
              resolve(undefined)
            };
            reader.onerror = reject
            reader.readAsDataURL(props.audioBlob)
          })
        } catch (e) {
          console.error("FileReader创建失败，回退到ObjectURL:", e)
          audioUrl.value = URL.createObjectURL(props.audioBlob)
          audioElement.value.src = audioUrl.value
        }
      }
      if (audioElement.value.readyState < 2) {
        console.log("等待音频加载...")
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("音频加载超时"))
          }, 5000)

          const cleanup = () => {
            clearTimeout(timeout)
            audioElement.value?.removeEventListener("canplay", onCanPlay)
            audioElement.value?.removeEventListener("error", onError)
          }
          const onCanPlay = () => {
            cleanup()
            resolve(undefined)
          }
          const onError = (e: Event) => {
            cleanup()
            reject(
              new Error(
                `音频加载失败: ${(e.target as HTMLAudioElement)?.error?.message || "未知错误"}`,
              ),
            )
          }
          audioElement.value!.addEventListener("canplay", onCanPlay, {
            once: true,
          })
          audioElement.value!.addEventListener("error", onError, {
            once: true,
          });
          audioElement.value!.load();
        });
      }
      await audioElement.value.play()
    }
  } catch (error) {
    console.error("播放控制失败:", error)
    isPlaying.value = false
  }
}
const handleSend = (): void => {
  emit("send")
}
const handleCancel = (): void => {
  emit("cancel")
}
const handleAudioEnded = (): void => {
  isPlaying.value = false
}
const handleAudioPause = (): void => {
  isPlaying.value = false
}
const handleAudioPlay = (): void => {
  isPlaying.value = true
}

onMounted(() => {
  if (props.audioBlob) {
    console.log("开始设置音频源，Blob信息:", {
      size: props.audioBlob.size,
      type: props.audioBlob.type
    })
    nextTick(() => {
      if (audioElement.value) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result && audioElement.value) {
            audioUrl.value = e.target.result as string
            audioElement.value.src = audioUrl.value
            console.log("音频data URL设置成功，长度:", audioUrl.value.length)
          }
        }
        reader.onerror = (e) => {
          console.error("FileReader读取失败:", e)
        }
        reader.readAsDataURL(props.audioBlob)
      } else {
        console.error("音频元素未找到")
      }
    })
  }
})
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
  }
})
</script>

<template>
  <div v-if="visible" class="voice-preview-container">
    <div class="voice-preview">
      <div class="voice-info">
        <div class="voice-icon">
          <i class="iconfont icon-voice"></i>
        </div>
        <div class="voice-details">
          <span class="voice-duration">{{ formatTime(duration) }}</span>
          <span class="voice-label">语音消息</span>
        </div>
      </div>

      <div class="voice-controls">
        <button class="control-btn play-btn" @click="togglePlay">
          <i
            class="iconfont"
            :class="isPlaying ? 'icon-pause' : 'icon-play'"
          ></i>
        </button>
        <button class="control-btn cancel-btn" @click="handleCancel">
          <i class="iconfont icon-close"></i>
        </button>
        <button class="control-btn send-btn" @click="handleSend">
          <i class="iconfont icon-send"></i>
          发送
        </button>
      </div>
    </div>
    <audio
      ref="audioElement"
      preload="none"
      style="display: none"
      @ended="handleAudioEnded"
      @pause="handleAudioPause"
      @play="handleAudioPlay"
    ></audio>
  </div>
</template>

<style scoped>
.voice-preview-container {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin: 0 24px 12px 24px;
  z-index: 4;
}

.voice-preview {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); /* Safari兼容性 */
  box-shadow:
    0 -4px 20px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  overflow: hidden;
}

/* 增强毛玻璃效果的伪元素 */
.voice-preview::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0.02) 100%
  );
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
}

.voice-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.voice-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
  border-radius: 50%;
  color: #fff;
  box-shadow:
    0 2px 8px rgba(76, 175, 80, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

.voice-icon:hover {
  transform: translateY(-1px);
  box-shadow:
    0 4px 12px rgba(76, 175, 80, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.voice-icon i {
  font-size: 18px;
}

.voice-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.voice-duration {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
}

.voice-label {
  color: #bbb;
  font-size: 12px;
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  gap: 4px;
}

.play-btn {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.play-btn:hover {
  background: rgba(76, 175, 80, 0.3);
  transform: scale(1.05);
}

.cancel-btn {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.cancel-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  transform: scale(1.05);
}

.send-btn {
  background: linear-gradient(135deg, #64b5f6, #42a5f5);
  color: #fff;
  padding: 0 12px;
  border-radius: 18px;
  font-weight: 500;
}

.send-btn:hover {
  background: linear-gradient(135deg, #42a5f5, #2196f3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(100, 181, 246, 0.3);
}

.send-btn i {
  font-size: 16px;
}
</style>
