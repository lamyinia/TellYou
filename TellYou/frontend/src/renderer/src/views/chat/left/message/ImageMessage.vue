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
import VueEasyLightbox from "vue-easy-lightbox";

const props = defineProps<{ message: ChatMessage }>();
const userStore = useUserStore();
const isSelf = computed(() => props.message.senderId === userStore.myId);
const showStrategy = "thumbedAvatarUrl";

const downloadState = ref<DownloadState>({ status: "idle" });
const showViewer = ref(false);
const currentImageUrl = ref("");
const thumbnailUrl = ref(props.message.content); // 缩略图 URL，初始为原始 URL
const isViewingOriginal = ref(false);

let unsubscribe: (() => void) | null = null;

onMounted(async () => {
  subscribeToDownload("thumbnail");
  const result = await mediaDownloadManager.requestMedia(
    props.message.id,
    "thumbnail",
    "image",
  );
  // 如果已经有缓存的缩略图，直接使用
  if (result) {
    console.log("使用已缓存的缩略图:", result);
    thumbnailUrl.value = result;
  }
});
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
// 订阅下载状态的通用方法
const subscribeToDownload = (type: "original" | "thumbnail") => {
  // 取消之前的订阅
  if (unsubscribe) {
    unsubscribe();
  }
  console.log("image-message:subscribe", type);
  unsubscribe = mediaDownloadManager.subscribe(
    props.message.id,
    type,
    "image",
    (state) => {
      downloadState.value = state;
      // 当下载完成时，更新对应的图片 URL
      if (state.status === "completed" && state.localPath) {
        console.log(`${type}下载完成，更新 URL:`, state.localPath);
        if (type === "thumbnail") {
          thumbnailUrl.value = state.localPath;
        } else if (type === "original") {
          currentImageUrl.value = state.localPath;
        }
      }
    },
  );
};

const handleImageClick = async (): Promise<void> => {
  if (!isViewingOriginal.value) {
    // 第一次点击：切换到监听原图下载进度
    isViewingOriginal.value = true;
    subscribeToDownload("original");
    // 请求原图（通过字符串拼接调用image:cache:get:original）
    const result = await mediaDownloadManager.requestMedia(
      props.message.id,
      "original",
      "image",
    );
    // 如果已经有本地缓存，直接使用
    if (result) {
      console.log("使用已缓存的原图:", result);
      currentImageUrl.value = result;
    }
  }
  // 显示图片查看器（如果没有本地缓存，先显示原始 URL）
  if (
    !currentImageUrl.value ||
    currentImageUrl.value === props.message.content
  ) {
    currentImageUrl.value = props.message.content;
  }
  showViewer.value = true;
};

const downloadPercentage = computed(() => {
  return downloadState.value.progress?.percentage || 0;
});

const isDownloading = computed(() => {
  return downloadState.value.status === "downloading";
});
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
        <div class="image-container">
          <img
            class="image"
            :src="thumbnailUrl"
            alt="image"
            @click="handleImageClick"
          />
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
    </template>
    <template v-else>
      <div class="content right">
        <NickName
          :user-id="props.message.senderId"
          :version="props.message.nicknameVersion"
          :name="props.message.senderName"
          side="right"
        />
        <div class="image-container">
          <img
            class="image"
            :src="thumbnailUrl"
            alt="image"
            @click="handleImageClick"
          />
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
  <vue-easy-lightbox
    :visible="showViewer"
    :imgs="[currentImageUrl]"
    :index="0"
    @hide="showViewer = false"
  />
</template>

<style scoped>
@import "@renderer/styles/message-common.css";
</style>
