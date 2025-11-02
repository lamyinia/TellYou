<script setup lang="ts">
/* eslint-disable */

import { ref, computed, watch, onMounted } from "vue"
import type { Session } from "@shared/types/session"
import Avatar from "@renderer/components/Avatar.vue"
import NickName from "@renderer/components/NickName.vue"
import feedbackUtil from "@renderer/utils/feedback-util"

interface MemberInfo {
  userId: string
  role: number  // 0=普通成员, 1=成员, 2=管理员, 3=群主
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

const members = ref<MemberInfo[]>([])
const loading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const totalMembers = ref(0) // 总成员数
const pageSize = 25

const roleLabel = (role: number): string => {
  if (role === 3) return "群主"
  if (role === 2) return "管理员"
  return ""
}

const roleClass = (role: number): string => {
  if (role === 3) return "role-owner"
  if (role === 2) return "role-manager"
  return ""
}

const loadMembers = async (page: number = 1): Promise<void> => {
  if (!props.currentContact || props.currentContact.contactType !== 2) return
  if (loading.value || (!hasMore.value && page > 1)) return

  loading.value = true
  const response = await window.electronAPI.invoke("proxy:group:get-member-list", {
    groupId: props.currentContact.contactId,
    pageNo: page,
    pageSize: pageSize
  })

  if (response && response.success === false) {
    feedbackUtil.error("加载群成员失败", response.message || "未知错误")
    loading.value = false
    return
  }

  if (response && response.data) {
    const pageData = response.data as {
      list?: { userId: number, role: number }[]
      totalRecords?: number
      isLast?: boolean
      pageNo?: number
      pageSize?: number
    }
    
    // 兼容处理：如果直接是数组（旧格式），或在新格式的list中
    const memberList = pageData.list || (Array.isArray(response.data) ? response.data : [])
    
    if (memberList.length > 0) {
      const newMembers = memberList as { userId: number, role: number }[]
      
      if (page === 1) {
        members.value = newMembers.map(m => ({
          userId: String(m.userId),
          role: m.role
        }))
      } else {
        members.value.push(...newMembers.map(m => ({
          userId: String(m.userId),
          role: m.role
        })))
      }

      // 更新总数
      if (pageData.totalRecords !== undefined) {
        totalMembers.value = pageData.totalRecords
      }

      // 判断是否还有更多数据
      if (pageData.isLast !== undefined) {
        hasMore.value = !pageData.isLast
      } else if (newMembers.length < pageSize) {
        hasMore.value = false
      } else {
        // 如果有总数，可以通过计算判断
        if (totalMembers.value > 0) {
          hasMore.value = members.value.length < totalMembers.value
        } else {
          hasMore.value = true
        }
      }
      
      currentPage.value = page
    } else {
      // 没有更多数据了
      hasMore.value = false
    }
  }

  loading.value = false
}

const loadMore = async (): Promise<void> => {
  if (!loading.value && hasMore.value) {
    await loadMembers(currentPage.value + 1)
  }
}

const handleScroll = (event: Event): void => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  const distanceToBottom = scrollHeight - scrollTop - clientHeight

  // 距离底部50px时加载更多
  if (distanceToBottom < 50 && hasMore.value && !loading.value) {
    loadMore()
  }
}

const close = (): void => {
  drawerOpen.value = false
}

// 重置状态
const resetState = (): void => {
  members.value = []
  currentPage.value = 1
  hasMore.value = true
  totalMembers.value = 0
}

watch(
  () => drawerOpen.value,
  (open) => {
    if (open && props.currentContact?.contactType === 2) {
      resetState()
      loadMembers(1)
    } else if (!open) {
      // 关闭时重置，释放资源
      resetState()
    }
  }
)
watch(
  () => props.currentContact?.contactId,
  () => {
    if (drawerOpen.value && props.currentContact?.contactType === 2) {
      resetState()
      loadMembers(1)
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
            <span>群成员</span>
            <span v-if="props.currentContact" class="member-count">
              ({{ totalMembers > 0 ? totalMembers : members.length }}{{ hasMore && totalMembers === 0 ? '+' : '' }})
            </span>
          </div>
          <button class="close-btn" @click="close">
            <i class="iconfont icon-close"></i>
          </button>
        </div>

        <div class="drawer-content" @scroll="handleScroll">
          <div v-if="members.length === 0 && !loading" class="empty-state">
            <div class="empty-text">暂无成员</div>
          </div>

          <div v-else class="member-list">
            <div
              v-for="member in members"
              :key="member.userId"
              class="member-item"
            >
              <Avatar
                :target-id="member.userId"
                :contact-type="1"
                strategy="thumbedAvatarUrl"
                version="0"
                shape="circle"
                :size="48"
                :fallback-text="member.nickname || '?'"
              />
              
              <div class="member-info">
                <NickName
                  :target-id="member.userId"
                  :contact-type="1"
                  nickname-version="0"
                  class="member-name"
                />
                <div v-if="roleLabel(member.role)" :class="['role-badge', roleClass(member.role)]">
                  {{ roleLabel(member.role) }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading" class="loading-indicator">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="!hasMore && members.length > 0" class="no-more">
            已加载全部成员
          </div>
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

.member-count {
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

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.2s;
}

.member-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(2px);
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.member-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  align-self: flex-start;
}

.role-owner {
  background: linear-gradient(135deg, #ffd700 0%, #ffb300 100%);
  color: #000;
}

.role-manager {
  background: linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%);
  color: #fff;
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

/* 滚动条样式 */
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
