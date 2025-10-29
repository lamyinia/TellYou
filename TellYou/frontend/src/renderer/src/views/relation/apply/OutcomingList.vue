<script setup lang="ts">
/* eslint-disable */

import { computed } from "vue"
import { useApplicationStore } from "@renderer/status/application/store"
import { ApplicationItem } from "@shared/types/application"
import { formatTime } from "@shared/utils/process"
import Avatar from "@renderer/components/Avatar.vue"
import NickName from "@renderer/components/NickName.vue"

const appStore = useApplicationStore()
const rows = computed<ApplicationItem[]>(
  () => appStore.outgoing as unknown as ApplicationItem[],
)
const page = computed(() => appStore.outgoingPage)

const pageNo = computed<number>({
  get: () => page.value.pageNo,
  set: (val: number) => {
    if (val && val !== page.value.pageNo) appStore.reloadOutgoing(val)
  },
})

const pageLength = computed(() =>
  Math.max(1, Math.ceil(page.value.total / page.value.pageSize)),
)
const onPageChange = (newPage: number): void => {
  appStore.reloadOutgoing(newPage)
}
</script>

<template>
  <v-list density="compact" class="mt-2">
    <v-list-item v-for="item in rows" :key="item.applyId">
      <template #prepend>
        <Avatar
          :target-id="item.targetId"
          :contact-type="1"
          :version="'0'"
          strategy="thumbedAvatarUrl"
          shape="circle"
          fallback-text="未知"
        />
      </template>

      <template #title>
        <NickName
          :target-id="item.targetId"
          contact-type="1"
          :nickname-version="'99999'"
          :placeholder="'未知'"
          side="left"
        />
      </template>
      <template #subtitle>
        <div class="subline">
          <span class="info">申请备注：{{ item.applyInfo || "无" }}</span>
          <span class="dot">·</span>
          <span class="time">{{ formatTime(item.lastApplyTime) || "" }}</span>
        </div>
      </template>

      <template #append>
        <v-chip
          size="x-small"
          :color="
            item.status === 0
              ? 'warning'
              : item.status === 1
                ? 'success'
                : 'error'
          "
        >
          {{ item.status === 0 ? "对方待处理" : "对方已同意" }}
        </v-chip>
      </template>
    </v-list-item>
  </v-list>

  <div class="pager">
    <v-pagination
      v-model="pageNo"
      :length="pageLength"
      density="comfortable"
      :total-visible="9"
      show-first-last
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.mt-2 {
  margin-top: 8px;
}
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
.subline {
  display: flex;
  gap: 6px;
  align-items: center;
  opacity: 0.85;
}
.subline .dot {
  opacity: 0.6;
}
.subline .time {
  opacity: 0.8;
  font-size: 12px;
}
</style>
