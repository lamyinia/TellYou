<script setup lang="ts">
import RightNavBar from "../components/RightNavBar.vue";
import { onMounted, onUnmounted, ref } from "vue";
import { useSessionStore } from "@renderer/status/session/store";
import { useMessageStore } from "@renderer/status/message/store";
import { useApplicationStore } from "@renderer/status/application/store";
import { useBlackStore } from "@renderer/status/black/store";

const sessionStore = useSessionStore();
const messageStore = useMessageStore();
const applicationStore = useApplicationStore();
const blackStore = useBlackStore();

// 添加loading状态 - 只在首次进入时显示
const isInitializing = ref(!sessionStorage.getItem("main-initialized"));

onMounted(async () => {
  console.log("Main.vue mounted, 开始初始化数据");
  try {
    // 调用同步的init方法
    sessionStore.init();
    messageStore.init();
    applicationStore.init();
    blackStore.init();

    console.log("Main.vue 所有store初始化调用完成");

    // 等待一个短暂的时间确保初始化完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Main.vue 初始化完成，隐藏loading界面");
    isInitializing.value = false;
    // 记录初始化完成状态，避免路由切换时重复初始化
    sessionStorage.setItem("main-initialized", "true");
  } catch (error) {
    console.error("Main.vue 初始化失败:", error);
    // 即使初始化失败也要隐藏loading
    isInitializing.value = false;
    sessionStorage.setItem("main-initialized", "true");
  }
});
onUnmounted(() => {
  console.log("Main.vue unmounted, 清理资源");
  sessionStore.destroy();
  messageStore.destroy();
  applicationStore.destroy();
  blackStore.destroy();
});
</script>

<template>
  <!-- 初始化中的loading界面 -->
  <div v-if="isInitializing" class="main-loading-mask">
    <img
      src="@renderer/assets/img/loading.avif"
      alt="initializing"
      class="loading-image"
    />
    <div class="loading-text">正在初始化...</div>
  </div>

  <!-- 正常的主界面 -->
  <v-app v-else>
    <v-main>
      <v-container
        fluid
        class="main-container"
        style="padding: 0; height: 100vh"
      >
        <v-row no-gutters style="height: 100%">
          <v-col style="height: 100%">
            <router-view />
          </v-col>
          <v-col cols="auto">
            <RightNavBar />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.main-container {
  height: 100vh;
  overflow: hidden;
}

.main-loading-mask {
  width: 100%;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-in;
}

.loading-image {
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 20px;
}

.loading-text {
  color: white;
  font-size: 16px;
  font-weight: 500;
  opacity: 0.9;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
