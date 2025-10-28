<script setup lang="ts">
import type { ChatMessage } from "@renderer/status/message/class";
import { useUserStore } from "@main/electron-store/persist/user-store";
import { computed, ref, onMounted, onUnmounted } from "vue";
import Avatar from "@renderer/components/Avatar.vue";
import NickName from "@renderer/components/NickName.vue";
import {
  mediaDownloadManager,
  type DownloadState,
} from "@renderer/utils/media-download-manager";

const props = defineProps<{ message: ChatMessage }>();
const userStore = useUserStore();
const isSelf = computed(() => props.message.senderId === userStore.myId);
const showStrategy = "thumbedAvatarUrl";

const downloadState = ref<DownloadState>({ status: "idle" });
const audioUrl = ref("");
const audioElement = ref<HTMLAudioElement>();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  subscribeToDownload();
  const result = await mediaDownloadManager.requestMedia(
    props.message.id,
    "original",
    "voice",
  );
  if (result) {
    console.log("使用已缓存的语音:", result);
    try {
      const blobResult = await window.electronAPI.invoke(
        "voice:convert-to-blob",
        result,
      );
      if (blobResult && blobResult.success) {
        audioUrl.value = blobResult.dataUrl;
      } else {
        console.error("音频转换失败:", blobResult?.error);
      }
    } catch (error) {
      console.error("音频转换调用失败:", error);
    }
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (audioElement.value) {
    audioElement.value.pause();
  }
});

const subscribeToDownload = (): void => {
  unsubscribe = mediaDownloadManager.subscribe(
    props.message.id,
    "original",
    "voice",
    async (state) => {
      downloadState.value = state;
      if (state.status === "completed" && state.localPath) {
        console.log("语音下载完成:", state.localPath);
        try {
          const blobResult = await window.electronAPI.invoke(
            "voice:convert-to-blob",
            state.localPath,
          );
          if (blobResult && blobResult.success) {
            audioUrl.value = blobResult.dataUrl;
          } else {
            console.error("音频转换失败:", blobResult?.error);
          }
        } catch (error) {
          console.error("音频转换调用失败:", error);
        }
      }
    },
  );
};

const formatTime = (time: number) => {
  if (!time || !isFinite(time) || isNaN(time)) {
    return "0:00";
  }
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const togglePlay = async () => {
  if (!audioUrl.value) {
    const result = await mediaDownloadManager.requestMedia(
      props.message.id,
      "original",
      "voice",
    );
    if (result) {
      // 使用新的 voice:convert-to-blob API 转换音频
      try {
        const blobResult = await window.electronAPI.invoke(
          "voice:convert-to-blob",
          result,
        );
        if (blobResult && blobResult.success) {
          audioUrl.value = blobResult.dataUrl;
        } else {
          console.error("音频转换失败:", blobResult?.error);
          return;
        }
      } catch (error) {
        console.error("音频转换调用失败:", error);
        return;
      }
    } else {
      console.error("语音文件获取失败");
      return;
    }
  }
  if (!audioElement.value) return;
  try {
    if (isPlaying.value) {
      audioElement.value.pause();
    } else {
      if (audioElement.value.src !== audioUrl.value) {
        audioElement.value.src = audioUrl.value;
        await new Promise((resolve, reject) => {
          const handleLoad = () => {
            audioElement.value?.removeEventListener(
              "loadedmetadata",
              handleLoad,
            );
            audioElement.value?.removeEventListener("error", handleError);
            resolve(true);
          };
          const handleError = (e: Event) => {
            audioElement.value?.removeEventListener(
              "loadedmetadata",
              handleLoad,
            );
            audioElement.value?.removeEventListener("error", handleError);
            reject(
              new Error(
                `音频加载失败: ${(e.target as HTMLAudioElement)?.error?.message || "未知错误"}`,
              ),
            );
          };
          audioElement.value?.addEventListener("loadedmetadata", handleLoad);
          audioElement.value?.addEventListener("error", handleError);
          audioElement.value?.load();
        });
      }

      await audioElement.value.play();
    }
  } catch (error) {
    console.error("播放失败:", error);
  }
};

const onLoadedMetadata = () => {
  if (audioElement.value) {
    const audioDuration = audioElement.value.duration;
    // 确保duration是有效数值
    if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0) {
      duration.value = audioDuration;
    } else {
      duration.value = 0;
    }
  }
};

const onTimeUpdate = () => {
  if (audioElement.value) {
    currentTime.value = audioElement.value.currentTime;
  }
};

const onPlay = () => {
  isPlaying.value = true;
};

const onPause = () => {
  isPlaying.value = false;
};

const onEnded = () => {
  isPlaying.value = false;
  currentTime.value = 0;
};

const downloadPercentage = computed(() => {
  const percentage = downloadState.value.progress?.percentage || 0;
  // 调试信息：打印下载状态
  console.log("语音下载状态:", {
    status: downloadState.value.status,
    percentage: percentage,
    progress: downloadState.value.progress,
  });
  return percentage;
});

const isDownloading = computed(() => {
  return (
    downloadState.value.status === "downloading" &&
    (downloadState.value.progress?.percentage || 0) < 100
  );
});

const generateWaveform = () => {
  const bars = [];
  for (let i = 0; i < 20; i++) {
    bars.push(Math.random() * 0.8 + 0.2); // 0.2-1.0 之间的随机值
  }
  return bars;
};

const waveformBars = generateWaveform();
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
                <path d="M8 5v14l11-7z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </div>

            <div class="waveform">
              <div
                v-for="(height, index) in waveformBars"
                :key="index"
                class="wave-bar"
                :class="{
                  active: isPlaying && (currentTime / duration) * 20 > index,
                }"
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
                <path d="M8 5v14l11-7z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </div>

            <div class="waveform">
              <div
                v-for="(height, index) in waveformBars"
                :key="index"
                class="wave-bar"
                :class="{
                  active: isPlaying && (currentTime / duration) * 20 > index,
                }"
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
      style="display: none"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
  </div>
</template>

<style scoped>
@import "@renderer/styles/message-common.css";

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
  background: #4caf50;
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
  background: #4caf50;
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
  stroke: #4caf50;
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
  background: #007aff;
  color: white;
}

.content.right .voice-message:hover {
  background: #0056cc;
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
