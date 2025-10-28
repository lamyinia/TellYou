<script setup lang="ts">
/* eslint-disable */
import { ref, computed } from "vue"
import feedbackUtil from "@renderer/utils/feedback-util"

const props = defineProps<{ outTab: string }>()
const emit = defineEmits<{ (e: "toggle", newValue: string): void }>()

// 创建群聊对话框状态
const createGroupDialog = ref(false)
const groupName = ref("")
const isCreating = ref(false)

// 表单验证
const groupNameRules = [
  (v: string) => !!v || "群名称不能为空",
  (v: string) => (v && v.length <= 30) || "群名称不能超过30个字符",
  (v: string) => (v && v.trim().length > 0) || "群名称不能只包含空格",
]

// 字符计数
const characterCount = computed(() => groupName.value.length)

// 创建群聊
const createGroup = async (): Promise<void> => {
  if (isCreating.value) return

  // 验证表单
  if (!groupName.value.trim()) {
    feedbackUtil.error("创建失败", "请输入群名称")
    return
  }

  if (groupName.value.length > 30) {
    feedbackUtil.error("创建失败", "群名称不能超过30个字符")
    return
  }

  isCreating.value = true

  try {
    const result = await window.electronAPI.invoke("proxy:group:create-group", {
      name: groupName.value.trim(),
    })

    if (result.success) {
      feedbackUtil.success("创建成功", `群聊"${groupName.value}"创建成功`)

      groupName.value = ""
      createGroupDialog.value = false

      // emit('refresh-groups');
    } else {
      feedbackUtil.error("创建失败", result.message || "创建群聊时发生错误")
    }
  } catch (error: any) {
    console.error("创建群聊失败:", error)

    // 处理特定错误
    if (error.message?.includes("流控")) {
      feedbackUtil.warning("操作频繁", "请稍后再试，3分钟内最多创建3个群聊")
    } else {
      feedbackUtil.error("创建失败", error.message || "网络错误，请稍后重试")
    }
  } finally {
    isCreating.value = false
  }
}

// 取消创建
const cancelCreate = (): void => {
  groupName.value = ""
  createGroupDialog.value = false
}

// 打开创建群聊对话框
const openCreateDialog = (): void => {
  createGroupDialog.value = true
}
</script>

<template>
  <v-btn
    class="fab-sub fab-group"
    color="#b8c5ed"
    size="large"
    :ripple="true"
    rounded="xl"
    @click="emit('toggle', 'group-management')"
  >
    <v-icon icon="mdi-account-group-outline" size="22"></v-icon>
  </v-btn>

  <transition name="fade">
    <div
      v-if="props.outTab === 'group-management'"
      class="panel-wrap"
      @click.self="emit('toggle', '')"
    >
      <div class="panel" @click.stop>
        <div class="panel-inner">
          <div class="panel-header">
            <h3 class="panel-title">群聊管理</h3>
          </div>

          <div class="panel-content">
            <v-card
              class="create-group-card mb-4"
              elevation="2"
              @click="openCreateDialog"
            >
              <v-card-text class="create-card-content">
                <div class="create-icon-wrapper">
                  <v-icon icon="mdi-plus-circle" size="24" color="primary" />
                </div>
                <div class="create-text">
                  <div class="create-title">创建群聊</div>
                  <div class="create-subtitle">创建新的群聊</div>
                </div>
                <v-icon icon="mdi-chevron-right" size="20" class="create-arrow" />
              </v-card-text>
            </v-card>

            <!-- 我管理的群聊列表 -->
            <div class="group-section">
              <h4 class="section-title">我管理的群聊</h4>
              <div class="group-list">
                <!-- 这里后续添加群聊列表 -->
                <div class="empty-state">
                  <v-icon icon="mdi-account-group-outline" size="48" class="empty-icon" />
                  <p class="empty-text">暂无管理的群聊</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- 创建群聊对话框 -->
  <v-dialog
    v-model="createGroupDialog"
    max-width="400"
    persistent
  >
    <v-card class="create-dialog">
      <v-card-title class="dialog-title">
        <v-icon icon="mdi-account-group-outline" class="mr-2" />
        创建群聊
      </v-card-title>

      <v-card-text class="dialog-content">
        <v-text-field
          v-model="groupName"
          label="群名称"
          placeholder="请输入群名称（最多30字符）"
          :rules="groupNameRules"
          :counter="30"
          :disabled="isCreating"
          variant="outlined"
          class="group-name-input"
          @keyup.enter="createGroup"
        >
          <template #append-inner>
            <span class="character-counter">{{ characterCount }}/30</span>
          </template>
        </v-text-field>

        <div class="dialog-tips">
          <v-icon icon="mdi-information-outline" size="16" class="mr-1" />
          <span class="tips-text">群名称创建后可以修改</span>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isCreating"
          @click="cancelCreate"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :loading="isCreating"
          :disabled="!groupName.trim() || groupName.length > 30"
          @click="createGroup"
        >
          创建群聊
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fab-sub {
  position: fixed;
  left: 10px;
  width: 56px;
  height: 56px;
  min-width: 56px;
  border-radius: 50%;
  z-index: 49; /* 低于主铃铛 */
}
.fab-group {
  top: 100px;
}

.panel-wrap {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 39;
}
.panel {
  position: absolute;
  top: 30px;
  left: 80px;
  right: 16px;
  bottom: 16px;
}
.panel-inner {
  max-width: 960px;
  width: 100%;
  height: 100%;
  background: rgba(10, 12, 32, 0.96);
  border-radius: 16px;
  padding: 0;
  color: #e0e6f0;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(224, 230, 240, 0.1);
}

.panel-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e0e6f0;
}

.panel-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
}

/* 创建群聊卡片样式 */
.create-group-card {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-group-card:hover {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.create-card-content {
  display: flex;
  align-items: center;
  padding: 16px 20px !important;
}

.create-icon-wrapper {
  margin-right: 16px;
}

.create-text {
  flex: 1;
}

.create-title {
  font-size: 16px;
  font-weight: 500;
  color: #e0e6f0;
  margin-bottom: 4px;
}

.create-subtitle {
  font-size: 14px;
  color: rgba(224, 230, 240, 0.7);
}

.create-arrow {
  color: rgba(224, 230, 240, 0.5);
}

/* 群聊列表区域 */
.group-section {
  margin-top: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #e0e6f0;
  margin-bottom: 16px;
}

.group-list {
  min-height: 200px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  color: rgba(224, 230, 240, 0.3);
  margin-bottom: 16px;
}

.empty-text {
  color: rgba(224, 230, 240, 0.5);
  font-size: 14px;
  margin: 0;
}

/* 创建群聊对话框样式 */
.create-dialog {
  background: rgba(10, 12, 32, 0.98) !important;
  color: #e0e6f0;
}

.dialog-title {
  background: rgba(255, 255, 255, 0.05);
  color: #e0e6f0 !important;
  font-weight: 600;
  padding: 20px 24px;
}

.dialog-content {
  padding: 24px !important;
}

.group-name-input {
  margin-bottom: 16px;
}

.character-counter {
  font-size: 12px;
  color: rgba(224, 230, 240, 0.6);
}

.dialog-tips {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(33, 150, 243, 0.1);
  border-radius: 8px;
  border-left: 3px solid #2196f3;
}

.tips-text {
  font-size: 13px;
  color: rgba(224, 230, 240, 0.8);
}

.dialog-actions {
  padding: 16px 24px 20px;
  background: rgba(255, 255, 255, 0.02);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel {
    left: 16px;
    top: 16px;
  }

  .panel-content {
    padding: 16px 20px;
  }

  .create-card-content {
    padding: 12px 16px !important;
  }
}
</style>
