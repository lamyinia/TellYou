<script setup lang="ts">
import type { ChatMessage } from '@renderer/status/message/class'
import { useUserStore } from '@main/electron-store/persist/user-store'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'
import { mediaDownloadManager, type DownloadState } from '@renderer/utils/media-download-manager'

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = 'thumbedAvatarUrl'

const downloadState = ref<DownloadState>({ status: 'idle' })
const audioUrl = ref('')
const audioElement = ref<HTMLAudioElement>()
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

let unsubscribe: (() => void) | null = null

onMounted(async () => {
  // 订阅下载状态
  subscribeToDownload()
  const result = await mediaDownloadManager.requestMedia(
    props.message.id,
    'original',
    'voice'
  )
  if (result) {
    console.log('使用已缓存的语音:', result)
    audioUrl.value = result
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  if (audioElement.value) {
    audioElement.value.pause()
  }
})

const subscribeToDownload = () => {
  unsubscribe = mediaDownloadManager.subscribe(
    props.message.id,
    'original',
    'voice',
    (state) => {
      downloadState.value = state
      if (state.status === 'completed' && state.localPath) {
        console.log('语音下载完成:', state.localPath)
        audioUrl.value = state.localPath
      }
    }
  )
}

const formatTime = (time: number) => {
  // 处理无效时间值
  if (!time || !isFinite(time) || isNaN(time)) {
    return '0:00'
  }

  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const togglePlay = async () => {
  if (!audioUrl.value) {
    // 开始下载语音
    const result = await mediaDownloadManager.requestMedia(
      props.message.id,
      'original',
      'voice'
    )
    if (result) {
      audioUrl.value = result
    } else {
      console.error('语音文件获取失败')
      return
    }
  }

  if (!audioElement.value) return

  try {
    if (isPlaying.value) {
      audioElement.value.pause()
    } else {
      if (audioElement.value.src !== audioUrl.value) {
        console.log('设置音频源:', audioUrl.value)
        if (!checkAudioSupport(audioUrl.value)) {
          console.warn('浏览器可能不支持此音频格式')
        }
        const response = await fetch(audioUrl.value)
        const blob = await response.blob()
        console.log('voice:blob', blob.type)

        await validateAudioFile(audioUrl.value)
        const correctedUrl = await forceCorrectMimeType(audioUrl.value)
        audioElement.value.src = correctedUrl

        // 等待音频元数据加载
        await new Promise((resolve, reject) => {
          const handleLoad = () => {
            audioElement.value?.removeEventListener('loadedmetadata', handleLoad)
            audioElement.value?.removeEventListener('error', handleError)
            resolve(true)
          }
          const handleError = (e: Event) => {
            audioElement.value?.removeEventListener('loadedmetadata', handleLoad)
            audioElement.value?.removeEventListener('error', handleError)
            reject(new Error(`音频加载失败: ${(e.target as HTMLAudioElement)?.error?.message || '未知错误'}`))
          }
          audioElement.value?.addEventListener('loadedmetadata', handleLoad)
          audioElement.value?.addEventListener('error', handleError)
          audioElement.value?.load()
        })
      }

      await audioElement.value.play()
    }
  } catch (error) {
    console.error('播放失败:', error)

    // 尝试重新下载文件
    if (error instanceof Error && (error.message.includes('音频加载失败') || error.message.includes('音频文件验证失败'))) {
      console.log('尝试重新下载音频文件...')
      try {
        // 清除缓存并重新请求
        audioUrl.value = ''
        const result = await mediaDownloadManager.requestMedia(
          props.message.id,
          'original',
          'voice',
          true // 强制重新下载
        )
        if (result) {
          audioUrl.value = result
          console.log('重新下载完成，请再次点击播放')
        }
      } catch (retryError) {
        console.error('重新下载失败:', retryError)
      }
    }
  }
}

const onLoadedMetadata = () => {
  if (audioElement.value) {
    const audioDuration = audioElement.value.duration
    // 确保duration是有效数值
    if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0) {
      duration.value = audioDuration
      console.log('✅ 音频时长加载成功:', audioDuration, '秒')
    } else {
      console.warn('⚠️ 音频时长无效:', audioDuration)
      duration.value = 0
    }
  }
}

const onTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime
  }
}

const onPlay = () => {
  isPlaying.value = true
}

const onPause = () => {
  isPlaying.value = false
}

const onEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const downloadPercentage = computed(() => {
  const percentage = downloadState.value.progress?.percentage || 0
  // 调试信息：打印下载状态
  console.log('语音下载状态:', {
    status: downloadState.value.status,
    percentage: percentage,
    progress: downloadState.value.progress
  })
  return percentage
})

const isDownloading = computed(() => {
  // 只有在真正下载中且进度小于100%时才显示进度
  return downloadState.value.status === 'downloading' &&
         (downloadState.value.progress?.percentage || 0) < 100
})

// 生成波形条
const generateWaveform = () => {
  const bars = []
  for (let i = 0; i < 20; i++) {
    bars.push(Math.random() * 0.8 + 0.2) // 0.2-1.0 之间的随机值
  }
  return bars
}

const waveformBars = generateWaveform()

// 检查音频格式支持
const checkAudioSupport = (url: string): boolean => {
  const audio = document.createElement('audio')

  // 检查文件扩展名
  const extension = url.split('.').pop()?.toLowerCase()

  // 检查浏览器对不同格式的支持
  const supportMap: Record<string, string> = {
    'webm': 'audio/webm; codecs="opus"',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg; codecs="vorbis"',
    'm4a': 'audio/mp4'
  }

  if (extension && supportMap[extension]) {
    const canPlay = audio.canPlayType(supportMap[extension])
    console.log(`音频格式 ${extension} 支持情况:`, canPlay)
    return canPlay !== ''
  }

  return true // 默认尝试播放
}

// 强制修正MIME类型
const forceCorrectMimeType = async (url: string): Promise<string> => {
  try {
    // 检查文件扩展名
    const extension = url.split('.').pop()?.toLowerCase()
    if (extension === 'webm') {
      console.log('🔧 强制修正WebM文件的MIME类型')
      // 获取文件内容
      const response = await fetch(url)
      const blob = await response.blob()
      // 创建新的Blob，强制设置正确的MIME类型
      const correctedBlob = new Blob([blob], {
        type: 'audio/webm;codecs=opus'
      })
      // 创建新的URL
      const correctedUrl = URL.createObjectURL(correctedBlob)
      console.log('✅ MIME类型已修正为:', correctedBlob.type)
      return correctedUrl
    }
    // 其他格式直接返回原URL
    return url
  } catch (error) {
    console.error('❌ MIME类型修正失败:', error)
    return url // 失败时返回原URL
  }
}

// 验证音频文件完整性
const validateAudioFile = async (url: string): Promise<boolean> => {
  try {
    console.log('开始验证音频文件:', url)

    // 获取文件头信息
    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache'
    })

    if (!response.ok) {
      console.error('文件请求失败:', response.status, response.statusText)
      return false
    }

    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')

    console.log('文件信息:', {
      contentType,
      contentLength: contentLength ? `${contentLength} bytes` : 'unknown',
      url: url.substring(0, 100) + '...'
    })

    // 检查内容类型
    if (contentType && !contentType.startsWith('audio/')) {
      console.error('文件类型错误:', contentType)
      return false
    }

    // 检查文件大小（太小可能是错误页面）
    if (contentLength && parseInt(contentLength) < 100) {
      console.error('文件太小，可能损坏:', contentLength)
      return false
    }

    return true
  } catch (error) {
    console.error('文件验证失败:', error)
    return false
  }
}
</script>

<template>
  <div class="msg-row" :class="{ other: !isSelf }">
    <template v-if="isSelf">
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :target-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="left"
      />
      <div class="content left">
        <NickName
          :user-id="props.message.senderId"
          :version="props.message.nicknameVersion"
          :name="props.message.senderName"
          side="left"
        />
        <div class="voice-container">
          <div class="voice-message" @click="togglePlay">
            <div class="play-button">
              <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </div>

            <div class="waveform">
              <div
                v-for="(height, index) in waveformBars"
                :key="index"
                class="wave-bar"
                :class="{ active: isPlaying && (currentTime / duration) * 20 > index }"
                :style="{ height: height * 100 + '%' }"
              />
            </div>

            <div class="voice-duration">
              {{ formatTime(duration || 0) }}
            </div>

            <!-- 下载进度遮罩 -->
            <div v-if="isDownloading" class="download-overlay">
              <div class="progress-circle">
                <svg class="progress-svg" viewBox="0 0 36 36">
                  <path
                    class="progress-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="progress-bar"
                    :stroke-dasharray="`${downloadPercentage}, 100`"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="progress-text">{{ downloadPercentage }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="content right">
        <NickName
          :user-id="props.message.senderId"
          :version="props.message.nicknameVersion"
          :name="props.message.senderName"
          side="right"
        />
        <div class="voice-container">
          <div class="voice-message" @click="togglePlay">
            <div class="play-button">
              <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </div>

            <div class="waveform">
              <div
                v-for="(height, index) in waveformBars"
                :key="index"
                class="wave-bar"
                :class="{ active: isPlaying && (currentTime / duration) * 20 > index }"
                :style="{ height: height * 100 + '%' }"
              />
            </div>

            <div class="voice-duration">
              {{ formatTime(duration || 0) }}
            </div>

            <!-- 下载进度遮罩 -->
            <div v-if="isDownloading" class="download-overlay">
              <div class="progress-circle">
                <svg class="progress-svg" viewBox="0 0 36 36">
                  <path
                    class="progress-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="progress-bar"
                    :stroke-dasharray="`${downloadPercentage}, 100`"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="progress-text">{{ downloadPercentage }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Avatar
        :version="props.message.avatarVersion"
        :name="props.message.senderName"
        :target-id="props.message.senderId"
        :show-strategy="showStrategy"
        show-shape="normal"
        side="right"
      />
    </template>

    <audio
      ref="audioElement"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      style="display: none;"
    />
  </div>
</template>

<style scoped>
@import '@renderer/styles/message-common.css';

.voice-container {
  position: relative;
  max-width: 280px;
}

.voice-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.voice-message:hover {
  background: #e8e8e8;
  transform: scale(1.02);
}

.play-button {
  width: 32px;
  height: 32px;
  background: #4CAF50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.play-button:hover {
  background: #45a049;
  transform: scale(1.1);
}

.play-button svg {
  width: 16px;
  height: 16px;
}

.waveform {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 32px;
  flex: 1;
}

.wave-bar {
  width: 3px;
  background: #ccc;
  border-radius: 2px;
  transition: all 0.3s ease;
  min-height: 4px;
}

.wave-bar.active {
  background: #4CAF50;
}

.voice-duration {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  flex-shrink: 0;
}

.download-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  z-index: 10;
}

.progress-circle {
  position: relative;
  width: 40px;
  height: 40px;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 2;
}

.progress-bar {
  fill: none;
  stroke: #4CAF50;
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 10px;
  font-weight: bold;
}

/* 右侧消息样式调整 */
.content.right .voice-message {
  background: #007AFF;
  color: white;
}

.content.right .voice-message:hover {
  background: #0056CC;
}

.content.right .voice-duration {
  color: rgba(255, 255, 255, 0.8);
}

.content.right .wave-bar {
  background: rgba(255, 255, 255, 0.5);
}

.content.right .wave-bar.active {
  background: white;
}
</style>
