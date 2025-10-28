<script setup lang="ts">
import { ref } from "vue";
import { onAvatarError, resolveAvatar } from "@renderer/utils/process";

interface BaseInfo {
  keyId: string;
  type: string;
  name: string;
  avatar: string;
  signature: string;
  sex?: string;
}

const keyword = ref("");
const remark = ref("");
const emit = defineEmits<{
  notify: [text: string, color: "success" | "error" | "info"];
}>();
const showList = ref<BaseInfo[]>([]);
const selectUserId = ref<string>("");

const searchEvent = async (): Promise<void> => {
  showList.value.splice(0, showList.value.length);
  if (keyword.value.trim() === "" || keyword.value.length !== 19) {
    return;
  }
  const data = await window.electronAPI.invoke("proxy:search:user-or-group", {
    contactId: keyword.value,
    contactType: 1,
  });
  if (data && data.userId > 0) {
    showList.value.push({
      keyId: data.userId,
      type: "user",
      name: data.nickname,
      avatar: data.avatar,
      signature: data.signature,
      sex: data.sex === 0 ? "女" : "男",
    });
    console.log("search-page:search-result:", data);
  } else {
    emit("notify", "查询失败", "info");
  }
};
const handleSelect = (userId: string): void => {
  selectUserId.value = userId;
};
const sendRequest = async (): Promise<void> => {
  if (!selectUserId.value) {
    emit("notify", "请先选择一个用户", "error");
    return;
  }
  try {
    const description =
      remark.value.trim() === "" ? "发起好友申请" : remark.value;
    const payload = { contactId: selectUserId.value, description };
    const response = await window.electronAPI.invoke(
      "proxy:application:send-user",
      payload,
    );
    console.log("search-page:send-result", response);
    if (response.success) {
      emit("notify", "发送成功", "success");
    } else {
      emit("notify", response.errMsg, "error");
    }
  } catch (error) {
    console.log("search-page:send-error:", error);
  }
};
</script>

<template>
  <div class="search-page">
    <div class="search-box">
      <v-text-field
        v-model="keyword"
        density="compact"
        label="搜索目标 ID (按下 Enter 搜索)"
        variant="outlined"
        hide-details
        @keyup.enter="searchEvent"
      />
      <v-text-field
        v-model="remark"
        class="ml-2"
        density="compact"
        label="申请备注(可选)"
        variant="outlined"
        hide-details
      />
      <v-btn
        class="ml-2"
        color="primary"
        :disabled="!selectUserId"
        @click="sendRequest"
      >
        发送申请
      </v-btn>
    </div>
    <div class="result-grid">
      <div
        v-for="item in showList"
        :key="item.keyId"
        class="card"
        :class="{ selected: item.keyId === selectUserId }"
        @click="handleSelect(item.keyId)"
      >
        <img
          class="avatar"
          :src="resolveAvatar(item.avatar)"
          alt="avatar"
          @error="onAvatarError"
        />
        <div class="meta">
          <div class="name">{{ item.name }}</div>
          <div class="signature">{{ item.signature }}</div>
          <div class="sex">{{ item.sex }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  padding: 16px 0;
}
.search-box {
  display: flex;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 16px;
}
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition:
    transform 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
}
.card:hover {
  transform: translateY(-1px);
  border-color: rgba(144, 202, 249, 0.25);
}
.card.selected {
  background: rgba(144, 202, 249, 0.12);
  border-color: rgba(144, 202, 249, 0.45);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}
.meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name {
  font-weight: 600;
}
.signature {
  opacity: 0.8;
  font-size: 12px;
}
.sex {
  font-size: 12px;
  opacity: 0.9;
}
</style>
