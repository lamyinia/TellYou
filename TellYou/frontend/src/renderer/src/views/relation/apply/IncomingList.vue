<script setup lang="ts">
import { computed, ref } from 'vue'
import { useApplicationStore } from '@renderer/status/application/store'
import { ApplicationItem } from '@shared/types/application'
import Avatar from '@renderer/components/Avatar.vue'
import NickName from '@renderer/components/NickName.vue'
import { formatTime } from '@shared/utils/process'

const emit = defineEmits<{ notify: [text: string, color: 'success' | 'error' | 'info'] }>()
const appStore = useApplicationStore()
const selected = ref<Set<string>>(new Set())
const rows = computed<ApplicationItem[]>(() => appStore.incoming as unknown as ApplicationItem[])
const page = computed(() => appStore.incomingPage)

// 受控分页：双向绑定页码并在 setter 中触发加载
const pageNo = computed<number>({
  get: () => page.value.pageNo,
  set: (val: number) => {
    if (val && val !== page.value.pageNo) appStore.reloadIncoming(val)
  }
})

const pageLength = computed(() => Math.max(1, Math.ceil(page.value.total / page.value.pageSize)))

const allChecked = computed({
  get: () => rows.value.length > 0 && rows.value.every((i) => selected.value.has(i.applyId)),
  set: (val: boolean) => {
    selected.value.clear()
    if (val) rows.value.forEach((i) => selected.value.add(i.applyId))
  }
})

const toggle = (applyId: string): void => {
  if (selected.value.has(applyId)) selected.value.delete(applyId)
  else selected.value.add(applyId)
}

const approveSelected = async (): void => {
  const ids = Array.from(selected.value).map(String)
  const promises: Promise<any>[] = []
  ids.forEach((id: string): void => {
    promises.push(window.electronAPI.invoke('proxy:application:accept-friend', id))
  })

  await Promise.all(promises).then((results: any[]) => {
    results.forEach((data) => {
      console.log('incoming-list-promise', data)
      if (data && !data.success){
        _notify(data?.errMsg || '接受申请出错', 'error')
      }
    })
  })
  selected.value.clear()
}
const _notify = (text: string, color: 'success' | 'error' | 'info' = 'success'): void => {
  emit('notify', text, color)
}

</script>

<template>
  <div class="toolbar">
    <v-checkbox v-model="allChecked" label="全选" hide-details density="compact" />
    <div class="ml-2"></div>
    <v-btn size="small" color="primary" @click="approveSelected">同意</v-btn>
  </div>

  <v-list density="compact" class="mt-5">
    <v-list-item v-for="item in rows" :key="item.applyId">
      <template #prepend>
        <div class="prepend-wrap">
          <v-checkbox-btn :model-value="selected.has(item.applyId)" @click.stop="toggle(item.applyId)" />
          <Avatar
            :target-id="item.applyUserId"
            :version="'0'"
            :name="'未知'"
            :show-strategy="'thumbedAvatarUrl'"
            show-shape="normal"
            side="left"
          />
        </div>
      </template>

      <template #title>
        <NickName
          :user-id="item.applyUserId"
          :version="'0'"
          :name="'未知'"
          side="left"
          :truncate="18"
        />
      </template>

      <template #subtitle>
        <div class="subline">
          <span class="info">申请备注：{{ item.applyInfo || '无' }}</span>
          <span class="dot">·</span>
          <span class="time">{{ formatTime(item.lastApplyTime) || '' }}</span>
        </div>
      </template>

      <template #append>
        <v-chip size="x-small" :color="item.status === 0 ? 'warning' : item.status === 1 ? 'success' : 'error'">
          {{ item.status === 0 ? '待处理' : '你已同意' }}
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
.prepend-wrap { display: flex; align-items: center; gap: 8px; }
.subline { display: flex; gap: 6px; align-items: center; opacity: 0.85; }
.subline .dot { opacity: 0.6; }
.subline .time { opacity: 0.8; font-size: 12px; }
</style>
