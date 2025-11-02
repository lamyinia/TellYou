<script setup lang="ts">
/* eslint-disable */

import { ref, computed, watch } from "vue"
import type { Session } from "@shared/types/session"
import Avatar from "@renderer/components/Avatar.vue"
import NickName from "@renderer/components/NickName.vue"
import feedbackUtil from "@renderer/utils/feedback-util"

interface FriendInfo {
  userId: string
  nickname?: string
  avatar?: string
}

const props = defineProps<{
  modelValue: boolean
  currentContact: Session | null
}>()

const emit = defineEmits<{
  (e: "update:modelValue", val: boolean): void
}>()

const drawerOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val)
})

const friends = ref<FriendInfo[]>([])
const selectedFriends = ref<Set<string>>(new Set())
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const totalFriends = ref(0)
const pageSize = 20
const inviting = ref(false)
const showConfirmDialog = ref(false)

const allSelected = computed(() => {
  return friends.value.length > 0 && selectedFriends.value.size === friends.value.length
})

const selectedCount = computed(() => selectedFriends.value.size)

const toggleSelect = (userId: string): void => {
  if (selectedFriends.value.has(userId)) {
    selectedFriends.value.delete(userId)
  } else {
    selectedFriends.value.add(userId)
  }
}

const toggleSelectAll = (): void => {
  if (allSelected.value) {
    selectedFriends.value.clear()
  } else {
    friends.value.forEach(friend => {
      selectedFriends.value.add(friend.userId)
    })
  }
}

const loadFriends = async (page: number = 1): Promise<void> => {
  if (!props.currentContact || props.currentContact.contactType !== 2) return
  if (loading.value || (!hasMore.value && page > 1)) return

  loading.value = true
  const response = await window.electronAPI.invoke("proxy:group:get-invitable-friend-list", {
    groupId: props.currentContact.contactId,
    pageNo: page,
    pageSize: pageSize
  })

  if (response && response.success === false) {
    feedbackUtil.error("加载可邀请好友失败", response.message || "未知错误")
    loading.value = false
    return
  }

  if (response && response.data) {
    const pageData = response.data as {
      list?: { userId: number }[]
      totalRecords?: number
      isLast?: boolean
      pageNo?: number
      pageSize?: number
    }

    const friendList = pageData.list || (Array.isArray(response.data) ? response.data : [])

    if (friendList.length > 0) {
      const newFriends = friendList as { userId: number }[]

      if (page === 1) {
        friends.value = newFriends.map(f => ({
          userId: String(f.userId)
        }))
        selectedFriends.value.clear()
      } else {
        friends.value.push(...newFriends.map(f => ({
          userId: String(f.userId)
        })))
      }

      if (pageData.totalRecords !== undefined) {
        totalFriends.value = pageData.totalRecords
      }

      if (pageData.isLast !== undefined) {
        hasMore.value = !pageData.isLast
      } else if (newFriends.length < pageSize) {
        hasMore.value = false
      } else {
        if (totalFriends.value > 0) {
          hasMore.value = friends.value.length < totalFriends.value
        } else {
          hasMore.value = true
        }
      }

      currentPage.value = page
    } else {
      hasMore.value = false
    }
  }

  loading.value = false
}

const loadMore = async (): Promise<void> => {
  if (!loading.value && hasMore.value) {
    await loadFriends(currentPage.value + 1)
  }
}

const handleScroll = (event: Event): void => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  const distanceToBottom = scrollHeight - scrollTop - clientHeight

  if (distanceToBottom < 50 && hasMore.value && !loading.value) {
    loadMore()
  }
}

const handleInvite = (): void => {
  if (selectedFriends.value.size === 0) {
    feedbackUtil.error("请选择要邀请的好友", "至少选择一个好友")
    return
  }
  showConfirmDialog.value = true
}

const confirmInvite = async (): Promise<void> => {
  if (!props.currentContact || selectedFriends.value.size === 0) return

  inviting.value = true
  const targetList = Array.from(selectedFriends.value)

  const response = await window.electronAPI.invoke("proxy:group:invite-friend", {
    groupId: props.currentContact.contactId,
    targetList: targetList
  })

  if (response && response.success === false) {
    feedbackUtil.error("邀请失败", response.message || "未知错误")
    inviting.value = false
    showConfirmDialog.value = false
    return
  }

  feedbackUtil.success("邀请成功", `已成功邀请 ${selectedFriends.value.size} 位好友`)
  showConfirmDialog.value = false
  inviting.value = false

  // 清除选中状态，刷新列表
  selectedFriends.value.clear()
  await resetAndReload()
}

const resetAndReload = async (): Promise<void> => {
  friends.value = []
  currentPage.value = 1
  hasMore.value = true
  totalFriends.value = 0
  await loadFriends(1)
}

const close = (): void => {
  drawerOpen.value = false
}

const resetState = (): void => {
  friends.value = []
  selectedFriends.value.clear()
  currentPage.value = 1
  hasMore.value = true
  totalFriends.value = 0
  showConfirmDialog.value = false
  inviting.value = false
}

watch(
  () => drawerOpen.value,
  (open) => {
    if (open && props.currentContact?.contactType === 2) {
      resetState()
      loadFriends(1)
    } else if (!open) {
      resetState()
    }
  }
)
watch(
  () => props.currentContact?.contactId,
  () => {
    if (drawerOpen.value && props.currentContact?.contactType === 2) {
      resetState()
      loadFriends(1)
    }
  }
)
</script>

<template>
  <transition name="drawer">
    <div v-if="drawerOpen" class="drawer-overlay" @click="close">
      <div class="drawer-panel" @click.stop>
        <div class="drawer-header">
          <div class="drawer-title">
            <span>邀请好友</span>
            <span v-if="props.currentContact && totalFriends > 0" class="friend-count">
              ({{ totalFriends }})
            </span>
          </div>
          <button class="close-btn" @click="close">
            <span class="close-icon">×</span>
          </button>
        </div>

        <div class="drawer-content" @scroll="handleScroll">
          <div v-if="friends.length === 0 && !loading" class="empty-state">
            <div class="empty-text">暂无可邀请的好友</div>
          </div>

          <div v-else class="friend-list">
            <div
              v-for="friend in friends"
              :key="friend.userId"
              class="friend-item"
              @click="toggleSelect(friend.userId)"
            >
              <input
                type="checkbox"
                :checked="selectedFriends.has(friend.userId)"
                @click.stop="toggleSelect(friend.userId)"
                class="friend-checkbox"
              />
              <Avatar
                :target-id="friend.userId"
                :contact-type="1"
                strategy="thumbedAvatarUrl"
                version="0"
                shape="circle"
                :size="48"
                :fallback-text="friend.nickname || '?'"
              />

              <div class="friend-info">
                <NickName
                  :target-id="friend.userId"
                  :contact-type="1"
                  nickname-version="0"
                  class="friend-name"
                />
              </div>
            </div>
          </div>

          <div v-if="loading" class="loading-indicator">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="!hasMore && friends.length > 0" class="no-more">
            已加载全部
          </div>
        </div>

        <div class="drawer-footer">
          <button class="select-all-btn" @click="toggleSelectAll">
            {{ allSelected ? "取消全选" : "全选" }}
          </button>
          <button
            class="invite-btn"
            :disabled="selectedCount === 0 || inviting"
            @click="handleInvite"
          >
            {{ inviting ? "邀请中..." : `确认邀请 (${selectedCount})` }}
          </button>
        </div>
      </div>
    </div>
  </transition>

  <!-- 确认对话框 -->
  <transition name="dialog">
    <div v-if="showConfirmDialog" class="dialog-overlay" @click="showConfirmDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>确认邀请</h3>
        </div>
        <div class="dialog-body">
          <p>确定要邀请 <strong>{{ selectedCount }}</strong> 位好友加入群聊吗？</p>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn cancel-btn" @click="showConfirmDialog = false">取消</button>
          <button class="dialog-btn confirm-btn" :disabled="inviting" @click="confirmInvite">
            {{ inviting ? "邀请中..." : "确认" }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  backdrop-filter: blur(4px);
}

.drawer-panel {
  width: 400px;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(25, 35, 85, 0.98) 0%,
    rgba(20, 24, 60, 0.98) 100%
  );
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #1a237e 0%, #0d133d 100%);
}

.drawer-title {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.friend-count {
  font-size: 14px;
  opacity: 0.7;
  font-weight: 400;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.close-icon {
  font-size: 24px;
  line-height: 1;
  font-weight: 300;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.friend-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
  cursor: pointer;
}

.friend-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(2px);
}

.friend-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #42a5f5;
}

.friend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.friend-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 24, 60, 0.95);
}

.select-all-btn {
  flex: 1;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.select-all-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.invite-btn {
  flex: 2;
  padding: 10px 16px;
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.invite-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.4);
}

.invite-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
}

.empty-text {
  font-size: 14px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.no-more {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

/* 确认对话框样式 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.dialog-content {
  background: linear-gradient(135deg, rgba(25, 35, 85, 0.98) 0%, rgba(20, 24, 60, 0.98) 100%);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 360px;
  max-width: 90vw;
  overflow: hidden;
}

.dialog-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
}

.dialog-body {
  padding: 24px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
}

.dialog-body strong {
  color: #42a5f5;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.confirm-btn {
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  color: #fff;
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.3s ease;
}

.drawer-enter-from {
  opacity: 0;
}

.drawer-enter-from .drawer-panel {
  transform: translateX(100%);
}

.drawer-leave-to {
  opacity: 0;
}

.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: transform 0.2s ease, scale 0.2s ease;
}

.dialog-enter-from {
  opacity: 0;
}

.dialog-enter-from .dialog-content {
  transform: scale(0.9) translateY(-10px);
}

.dialog-leave-to {
  opacity: 0;
}

.dialog-leave-to .dialog-content {
  transform: scale(0.9) translateY(-10px);
}

.drawer-content::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-track {
  background: transparent;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
