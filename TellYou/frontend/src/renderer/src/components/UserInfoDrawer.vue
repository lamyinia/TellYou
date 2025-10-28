<script setup lang="ts">
import { ref, watch, computed } from "vue";
import AvatarUpload from "./AvatarUpload.vue";
import { axio } from "../utils/request";
import { useUserStore } from "@main/electron-store/persist/user-store";

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    uid?: string;
    name?: string;
    avatarUrl?: string;
    signature?: string;
  }>(),
  { modelValue: false },
);

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void;
  (e: "logout"): void;
}>();

const userStore = useUserStore();

const open = ref(false);
watch(
  () => props.modelValue,
  (v) => (open.value = v),
  { immediate: true },
);

const localName = ref(userStore.nickname || "");
const localSignature = ref(userStore.signature || "");
let avatarFile: File | null = null;

const nicknameResidue = computed(() => userStore.nicknameResidue || 0);
const signatureResidue = computed(() => userStore.signatureResidue || 0);
const avatarResidue = computed(() => userStore.avatarResidue || 0);

watch(
  () => userStore.nickname,
  (newVal) => {
    if (newVal && newVal !== localName.value) {
      localName.value = newVal;
    }
  },
  { immediate: true },
);

watch(
  () => userStore.signature,
  (newVal) => {
    if (newVal && newVal !== localSignature.value) {
      localSignature.value = newVal;
    }
  },
  { immediate: true },
);

const savingAvatar = ref(false);
const savingName = ref(false);
const savingSignature = ref(false);
const avatarSaved = ref(false);
const nameSaved = ref(false);
const signatureSaved = ref(false);
const errorMessage = ref("");
const showError = ref(false);
const showUnsavedDialog = ref(false);
const close = (): void => {
  // 检查是否有未保存的更改
  const hasUnsavedChanges =
    (localName.value.trim() !== userStore.nickname && localName.value.trim()) ||
    localSignature.value.trim() !== userStore.signature;

  if (hasUnsavedChanges) {
    showUnsavedDialog.value = true;
    return;
  }
  emit("update:modelValue", false);
};
const confirmClose = (): void => {
  showUnsavedDialog.value = false;
  emit("update:modelValue", false);
};
const cancelClose = (): void => {
  showUnsavedDialog.value = false;
};
const showErrorMessage = (message: string): void => {
  errorMessage.value = message;
  showError.value = true;
  setTimeout(() => {
    showError.value = false;
  }, 3000);
};
const onAvatarUpdated = async (file: File): Promise<void> => {
  avatarFile = file;
  await saveAvatar();
};
const saveAvatar = async (): Promise<void> => {
  if (!avatarFile) return;
  if (avatarResidue.value <= 0) {
    showErrorMessage("头像更换次数已用完");
    return;
  }
  savingAvatar.value = true;
  try {
    const result = await window.electronAPI.uploadAvatar({
      filePath: (avatarFile as { path?: string }).path || "",
      fileName: avatarFile.name,
      fileSize: avatarFile.size,
      fileSuffix: "." + avatarFile.name.split(".").pop()?.toLowerCase(),
    });
    if (result.success) {
      const uploadResult = result as { success: boolean; avatarUrl: string };

      console.log("头像更新", uploadResult.avatarUrl);
      await userStore.updateUserField("avatarUrl", uploadResult.avatarUrl);
      await userStore.updateUserField("avatarResidue", avatarResidue.value - 1);

      avatarSaved.value = true;
      setTimeout(() => {
        avatarSaved.value = false;
      }, 2000);
      console.log("头像上传成功");
    } else {
      showErrorMessage("头像上传失败");
    }
  } catch (error) {
    console.error("头像上传失败:", error);
    showErrorMessage("头像上传失败，请重试");
  } finally {
    savingAvatar.value = false;
  }
};
const saveName = async (): Promise<void> => {
  if (!localName.value.trim()) return;
  if (nicknameResidue.value <= 0) {
    showErrorMessage("昵称修改次数已用完");
    return;
  }
  savingName.value = true;
  try {
    await updateUserInfo({ name: localName.value.trim() });
    // 更新 userStore
    await userStore.updateUserField("nickname", localName.value.trim());
    await userStore.updateUserField(
      "nicknameResidue",
      nicknameResidue.value - 1,
    );

    nameSaved.value = true;
    setTimeout(() => {
      nameSaved.value = false;
    }, 2000);
    console.log("昵称保存成功:", localName.value.trim());
  } catch (error) {
    console.error("昵称保存失败:", error);
    showErrorMessage("昵称保存失败，请重试");
  } finally {
    savingName.value = false;
  }
};
const saveSignature = async (): Promise<void> => {
  if (signatureResidue.value <= 0) {
    showErrorMessage("签名修改次数已用完");
    return;
  }
  savingSignature.value = true;
  try {
    await updateUserInfo({ signature: localSignature.value.trim() });
    await userStore.updateUserField("signature", localSignature.value.trim());
    await userStore.updateUserField(
      "signatureResidue",
      signatureResidue.value - 1,
    );

    signatureSaved.value = true;
    setTimeout(() => {
      signatureSaved.value = false;
    }, 2000);
    console.log("签名保存成功:", localSignature.value.trim());
  } catch (error) {
    console.error("签名保存失败:", error);
    showErrorMessage("签名保存失败，请重试");
  } finally {
    savingSignature.value = false;
  }
};
const updateUserInfo = async (data: {
  name?: string;
  signature?: string;
}): Promise<unknown> => {
  try {
    const response = await axio.put("/user/update", data);
    return response.data;
  } catch (error) {
    console.error("更新用户信息失败:", error);
    throw error;
  }
};
const onLogout = (): void => emit("logout");
</script>

<template>
  <v-navigation-drawer
    v-model="open"
    location="right"
    width="320"
    temporary
    class="user-drawer"
  >
    <div class="drawer-header">
      <div class="title">个人信息</div>
      <v-btn icon variant="text" @click="close"
        ><v-icon>mdi-close</v-icon></v-btn
      >
    </div>
    <div class="profile">
      <div class="avatar-section">
        <AvatarUpload
          :upload-on-click="false"
          :size="72"
          :disabled="avatarResidue <= 0"
          @updated="(f) => onAvatarUpdated(f)"
        />
        <div v-if="savingAvatar" class="saving-indicator">
          <v-progress-circular size="16" indeterminate color="primary" />
        </div>
        <div v-if="avatarSaved" class="success-indicator">
          <v-icon color="success" size="16">mdi-check</v-icon>
        </div>
        <div v-if="avatarResidue <= 0" class="disabled-indicator">
          <v-icon color="error" size="16">mdi-lock</v-icon>
        </div>
      </div>
      <div class="uid">UID: {{ userStore.myId || props.uid || "-" }}</div>
      <div class="residue-info">
        <div class="residue-item">
          <span class="label">头像更换:</span>
          <span class="count" :class="{ 'no-residue': avatarResidue <= 0 }">
            {{ avatarResidue }} 次
          </span>
        </div>
        <div class="residue-item">
          <span class="label">昵称修改:</span>
          <span class="count" :class="{ 'no-residue': nicknameResidue <= 0 }">
            {{ nicknameResidue }} 次
          </span>
        </div>
        <div class="residue-item">
          <span class="label">签名修改:</span>
          <span class="count" :class="{ 'no-residue': signatureResidue <= 0 }">
            {{ signatureResidue }} 次
          </span>
        </div>
      </div>
    </div>
    <div class="form">
      <div class="field-group">
        <v-text-field
          v-model="localName"
          label="昵称"
          variant="outlined"
          hide-details
          density="comfortable"
          :disabled="nicknameResidue <= 0"
        />
        <v-btn
          v-if="
            localName.trim() &&
            localName !== userStore.nickname &&
            nicknameResidue > 0
          "
          :loading="savingName"
          :disabled="savingName || nicknameResidue <= 0"
          size="small"
          color="primary"
          variant="text"
          @click="saveName"
        >
          {{ savingName ? "保存中" : "保存" }}
        </v-btn>
        <v-icon v-if="nameSaved" color="success" size="16">mdi-check</v-icon>
        <div v-if="nicknameResidue <= 0" class="disabled-hint">
          <v-icon color="error" size="14">mdi-lock</v-icon>
          <span>修改次数已用完</span>
        </div>
      </div>

      <div class="field-group">
        <v-textarea
          v-model="localSignature"
          label="签名"
          rows="2"
          max-rows="4"
          variant="outlined"
          hide-details
          density="comfortable"
          :disabled="signatureResidue <= 0"
        />
        <v-btn
          v-if="
            localSignature.trim() !== userStore.signature &&
            signatureResidue > 0
          "
          :loading="savingSignature"
          :disabled="savingSignature || signatureResidue <= 0"
          size="small"
          color="primary"
          variant="text"
          @click="saveSignature"
        >
          {{ savingSignature ? "保存中" : "保存" }}
        </v-btn>
        <v-icon v-if="signatureSaved" color="success" size="16"
          >mdi-check</v-icon
        >
        <div v-if="signatureResidue <= 0" class="disabled-hint">
          <v-icon color="error" size="14">mdi-lock</v-icon>
          <span>修改次数已用完</span>
        </div>
      </div>
    </div>
    <div class="actions">
      <v-btn color="error" variant="tonal" @click="onLogout">退出登录</v-btn>
    </div>
    <v-snackbar
      v-model="showError"
      :timeout="3000"
      color="error"
      location="top"
    >
      {{ errorMessage }}
    </v-snackbar>
    <v-dialog v-model="showUnsavedDialog" max-width="400">
      <v-card>
        <v-card-title>未保存的更改</v-card-title>
        <v-card-text>您有未保存的更改，确定要关闭吗？</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="cancelClose">取消</v-btn>
          <v-btn color="primary" variant="text" @click="confirmClose"
            >确定</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<style scoped>
.user-drawer :deep(.v-navigation-drawer__content) {
  background: rgba(17, 23, 43, 0.98);
  color: #e8eef7;
}
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
}
.title {
  font-weight: 600;
  letter-spacing: 0.5px;
}
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
}
.avatar-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.saving-indicator,
.success-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
}
.disabled-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
}
.uid {
  opacity: 0.8;
  font-size: 12px;
}
.residue-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  width: 100%;
}
.residue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.residue-item .label {
  opacity: 0.8;
}
.residue-item .count {
  font-weight: 500;
  color: #4caf50;
}
.residue-item .count.no-residue {
  color: #f44336;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 12px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-group :deep(.v-field) {
  margin-bottom: 0;
}
.disabled-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #f44336;
  margin-top: 4px;
}
.actions {
  display: flex;
  gap: 10px;
  padding: 12px;
}
</style>
