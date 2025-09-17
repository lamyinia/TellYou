<script setup lang="ts">
import { computed, ref } from 'vue'
import { useApplicationStore } from '@renderer/status/application/store'

const appStore = useApplicationStore()
const selected = ref<Set<number>>(new Set())

interface Row { id: number; applyId: string; userId: string; status: number; apply_info?: string; applyTime?: string }
const rows = computed<Row[]>(() => (appStore.incoming as unknown as Row[]))
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
  get: () => rows.value.length > 0 && rows.value.every((i) => selected.value.has(i.id)),
  set: (val: boolean) => {
    selected.value.clear()
    if (val) rows.value.forEach((i) => selected.value.add(i.id))
  }
})

const toggle = (id: number): void => {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
}

const approveSelected = (): void => {
  const ids = Array.from(selected.value).map(String)
  appStore.bulkApprove(ids)
  selected.value.clear()
  appStore.reloadIncoming(page.value.pageNo)
}
const rejectSelected = (): void => {
  const ids = Array.from(selected.value).map(String)
  appStore.bulkReject(ids)
  selected.value.clear()
  appStore.reloadIncoming(page.value.pageNo)
}

const onPageChange = (newPage: number): void => {
  appStore.reloadIncoming(newPage)
}
</script>

<template>
  <div class="toolbar">
    <v-checkbox
      v-model="allChecked"
      label="全选"
      hide-details
      density="compact"
    />
    <div class="ml-2"></div>
    <v-btn size="small" color="primary" @click="approveSelected">同意</v-btn>
    <v-btn class="ml-2" size="small" color="error" variant="tonal" @click="rejectSelected">拒绝</v-btn>
  </div>

  <v-list density="compact" class="mt-5">
    <v-list-item
      v-for="item in rows"
      :key="item.id"
      :title="`申请人: ${item.applyId}`"
      :subtitle="`${item.apply_info || ''}  ·  ${item.applyTime || ''}`"
    >
      <template #prepend>
        <v-checkbox-btn :model-value="selected.has(item.id)" @click.stop="toggle(item.id)" />
      </template>
      <template #append>
        <v-chip size="x-small" :color="item.status === 0 ? 'warning' : item.status === 1 ? 'success' : 'error'">
          {{ item.status === 0 ? '待处理' : item.status === 1 ? '已同意' : item.status === 2 ? '已拒绝' : '已撤回' }}
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
.ml-2 { margin-left: 8px; }
.mt-2 { margin-top: 8px; }
.pager {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
