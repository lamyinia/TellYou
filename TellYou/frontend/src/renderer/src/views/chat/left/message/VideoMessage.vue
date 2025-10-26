<script setup lang="ts">
import type { ChatMessage } from '@renderer/status/message/class'
import { useUserStore } from '@main/electron-store/persist/user-store'
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'
import { mediaDownloadManager, type DownloadState } from '@renderer/utils/media-download-manager'

const props = defineProps<{ message: ChatMessage }>()
const userStore = useUserStore()
const isSelf = computed(() => props.message.senderId === userStore.myId)
const showStrategy = 'thumbedAvatarUrl'

const downloadState = ref<DownloadState>({ status: 'idle' })
const thumbnailUrl = ref(props.message.content) // 缩略图 URL
const videoUrl = ref('')
const videoPlayerRef = ref()
const isVideoReady = ref(false)
const blobUrl = ref('')
const showVideoPlayer = ref(false)

let unsubscribe: (() => void) | null = null

// 将自定义协议URL转换为Blob URL供HTML5 video使用
const convertCustomProtocolUrl = async (customUrl: string): Promise<string> => {
  console.log('处理自定义协议URL:', customUrl)
  if (!customUrl.startsWith('tellyou://')) {
    return customUrl
  }
  try {
    console.log('通过fetch获取tellyou协议内容:', customUrl)
    const response = await fetch(customUrl)
    if (!response.ok) {
      throw new Error(`获取视频失败: ${response.status}`)
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    console.log('成功转换为blob URL:', blobUrl)
    return blobUrl
  } catch (error) {
    console.error('转换URL失败:', error)
    return customUrl
  }
}

onMounted(async () => {
  subscribeToDownload('thumbnail')
  const thumbnailResult = await mediaDownloadManager.requestMedia(
    props.message.id,
    'thumbnail',
    'video'
  )
  if (thumbnailResult) {
    console.log('使用已缓存的视频缩略图:', thumbnailResult)
    thumbnailUrl.value = thumbnailResult
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
  // 清理本地视频URL（如果是blob URL才需要清理）
  if (blobUrl.value && blobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl.value)
  }
})
// 订阅下载状态
const subscribeToDownload = (type: 'original' | 'thumbnail') => {
  if (unsubscribe) {
    unsubscribe()
  }

  unsubscribe = mediaDownloadManager.subscribe(
    props.message.id,
    type,
    'video',
    (state) => {
      downloadState.value = state
      if (state.status === 'completed' && state.localPath) {
        console.log(`视频${type}下载完成:`, state.localPath)
        if (type === 'thumbnail') {
          thumbnailUrl.value = state.localPath
        } else if (type === 'original') {
          videoUrl.value = state.localPath
          nextTick(() => {
            initializePlayer()
          })
        }
      }
    }
  )
}

// 初始化播放器
const initializePlayer = async () => {
  console.log('初始化HTML5视频播放器')
  if (videoUrl.value) {
    try {
      const compatibleUrl = await convertCustomProtocolUrl(videoUrl.value)
      blobUrl.value = compatibleUrl
      isVideoReady.value = true
      showVideoPlayer.value = true
      console.log('播放器初始化完成，视频URL:', compatibleUrl)
    } catch (error) {
      console.error('初始化播放器失败:', error)
    }
  }
}
// 点击播放视频
const handleVideoClick = async () => {
  console.log('点击播放视频', {
    hasVideoUrl: !!videoUrl.value,
    videoUrl: videoUrl.value,
    hasPlayer: !!videoPlayerRef.value,
    isVideoReady: isVideoReady.value
  })
  if (!videoUrl.value) {
    console.log('开始请求视频文件')
    subscribeToDownload('original')
    const result = await mediaDownloadManager.requestMedia(
      props.message.id,
      'original',
      'video'
    )
    console.log('视频请求结果:', result)
    if (result) {
      console.log('使用已缓存的视频:', result)
      videoUrl.value = result
      await nextTick()
      await initializePlayer()
    }
  } else {
    playVideo()
  }
}
// 播放视频
const playVideo = async (): Promise<void> => {
  console.log('尝试播放视频')
  if (!isVideoReady.value) {
    console.log('视频未准备好，初始化播放器')
    await initializePlayer()
  }
  // HTML5 video会自动处理播放
  showVideoPlayer.value = true
}

const onVideoPlay = (): void => {
  console.log('HTML5 video: 视频开始播放')
}

const onVideoPlaying = (): void => {
  console.log('HTML5 video: 视频正在播放')
}

const downloadPercentage = computed(() => {
  return downloadState.value.progress?.percentage || 0
})

const isDownloading = computed(() => {
  return downloadState.value.status === 'downloading'
})

const showThumbnail = computed(() => {
  return !showVideoPlayer.value
})
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
        <div class="video-container">
          <!-- HTML5视频播放器 -->
          <div v-show="showVideoPlayer" class="video-player">
            <video
              ref="videoPlayerRef"
              :src="blobUrl"
              :poster="thumbnailUrl"
              controls
              preload="metadata"
              style="width: 100%; height: auto;"
              @play="onVideoPlay"
              @playing="onVideoPlaying"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
          <!-- 缩略图预览 -->
          <div v-if="showThumbnail" class="video-thumbnail" @click="handleVideoClick">
            <img :src="thumbnailUrl" alt="video thumbnail" />
            <div class="play-overlay">
              <div class="play-button">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
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
        <div class="video-container">
          <!-- HTML5视频播放器 -->
          <div v-show="showVideoPlayer" class="video-player">
            <video
              ref="videoPlayerRef"
              :src="blobUrl"
              :poster="thumbnailUrl"
              controls
              preload="metadata"
              style="width: 100%; height: auto;"
              @play="onVideoPlay"
              @playing="onVideoPlaying"
            >
              您的浏览器不支持视频播放
            </video>
          </div>

          <!-- 缩略图预览 -->
          <div v-if="showThumbnail" class="video-thumbnail" @click="handleVideoClick">
            <img :src="thumbnailUrl" alt="video thumbnail" />
            <div class="play-overlay">
              <div class="play-button">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
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
  </div>
</template>

<style scoped>
@import '@renderer/styles/message-common.css';

.video-container {
  position: relative;
  max-width: 300px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.video-player {
  width: 100%;
}

.video-thumbnail {
  position: relative;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.video-thumbnail:hover {
  transform: scale(1.02);
}

.video-thumbnail img {
  width: 100%;
  height: auto;
  display: block;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.2s ease;
}

.video-thumbnail:hover .play-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.play-button {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  transition: all 0.2s ease;
}

.play-button:hover {
  background: white;
  transform: scale(1.1);
}

.play-button svg {
  width: 24px;
  height: 24px;
  margin-left: 2px; /* 视觉居中调整 */
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
  z-index: 10;
}

.progress-circle {
  position: relative;
  width: 80px;
  height: 80px;
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
  font-size: 14px;
  font-weight: bold;
}

/* HTML5 video 样式 */
.video-player {
  width: 100%;
  height: auto;
}
</style>
