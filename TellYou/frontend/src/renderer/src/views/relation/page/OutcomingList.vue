<script setup lang="ts">
import { computed, ref } from 'vue'
import { useApplicationStore } from '@renderer/status/application/store'

const appStore = useApplicationStore()
const selected = ref<Set<number>>(new Set())

interface Row { id: number; apply_user_id: string; target_id: string; status: number; apply_info?: string; last_apply_time?: string }
const rows = computed<Row[]>(() => (appStore.outgoing as unknown as Row[]))
const page = computed(() => appStore.outgoingPage)

// 受控分页
const pageNo = computed<number>({
  get: () => page.value.pageNo,
  set: (val: number) => {
    if (val && val !== page.value.pageNo) appStore.reloadOutgoing(val)
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

const cancelSelected = (): void => {
  const ids = Array.from(selected.value).map(String)
  appStore.bulkCancel(ids)
  selected.value.clear()
  appStore.reloadOutgoing(page.value.pageNo)
}

const onPageChange = (newPage: number): void => {
  appStore.reloadOutgoing(newPage)
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
    <v-btn class="ml-2" size="small" color="warning" @click="cancelSelected">撤回申请</v-btn>
  </div>

  <v-list density="compact" class="mt-2">
    <v-list-item
      v-for="item in rows"
      :key="item.id"
      :title="`目标: ${item.target_id}`"
      :subtitle="`${item.apply_info || ''}  ·  ${item.last_apply_time || ''}`"
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
.pager { display: flex; justify-content: center; margin-top: 8px; }
</style>
