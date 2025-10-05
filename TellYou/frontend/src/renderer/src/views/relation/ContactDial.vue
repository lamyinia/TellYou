<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSessionStore } from '@renderer/status/session/store'
import { onAvatarError, resolveAvatar } from '@renderer/utils/process'
import { SimpleContact } from '@renderer/views/relation/ContactManagementView.vue'
import pinyinUtil from '@renderer/utils/pinyin'

const emit = defineEmits<{ (e: 'select', sessionId: string): void }>()

const sessionStore = useSessionStore()
const contacts = computed<SimpleContact[]>(() => {
  return sessionStore.sortedSessions.map((s) => ({
    id: s.contactId,
    name: s.contactName,
    avatar: s.contactAvatar,
    sessionId: s.sessionId
  }))
})

type sessionDial = { letter: string; items: SimpleContact[] }
const simpleSessions = computed<sessionDial[]>(() => {
  const map = new Map<string, SimpleContact[]>()
  for (const l of pinyinUtil.LETTERS) {
    map.set(l, [])
  }
  map.set('#', [])

  for (const c of contacts.value) {
    const letter = pinyinUtil.getInitial(c.name)
    const key = pinyinUtil.LETTERS.includes(letter) ? letter : '#'
    map.get(key)!.push(c)
  }

  return [...map.entries()]
    .filter(([, items]) => items.length > 0)
    .sort((a, b) => {
      const ai = a[0] === '#' ? 26 : pinyinUtil.LETTERS.indexOf(a[0])
      const bi = b[0] === '#' ? 26 : pinyinUtil.LETTERS.indexOf(b[0])
      return ai - bi
    })
    .map(([letter, items]) => ({
      letter,
      items: items.sort((a, b) => pinyinUtil.collator.compare(a.name || '', b.name || ''))
    }))
})

const wrapRef = ref<HTMLElement | null>(null)
const currentLetter = ref<string>('')
let hideTimer: ReturnType<typeof setTimeout> | null = null

const onScroll = (): void => {
  const el = wrapRef.value
  if (!el) return
  const headers = Array.from(el.querySelectorAll('[data-letter]')) as HTMLElement[]
  let active = ''
  for (const h of headers) {
    const rect = h.getBoundingClientRect()
    const wrapTop = el.getBoundingClientRect().top
    if (rect.top - wrapTop <= 8) {
      active = h.dataset.letter || ''
    } else {
      break
    }
  }
  if (active) {
    currentLetter.value = active
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => (currentLetter.value = ''), 800)
  }
}

onMounted(() => wrapRef.value?.addEventListener('scroll', onScroll))
onBeforeUnmount(() => {
  wrapRef.value?.removeEventListener('scroll', onScroll)
  if (hideTimer) clearTimeout(hideTimer)
})

const onSelect = (contact: SimpleContact): void => emit('select', contact.sessionId)
</script>

<template>
  <div ref="wrapRef" class="dial-root">
    <div v-show="currentLetter" class="letter-float">{{ currentLetter }}</div>
    <div v-for="g in simpleSessions" :key="g.letter" class="group">
      <div class="group-header" :data-letter="g.letter">{{ g.letter }}</div>
      <div class="list">
        <div v-for="item in g.items" :key="item.id" class="item" @click="onSelect(item)">
          <img class="avatar" :src="resolveAvatar(item.avatar)" @error="onAvatarError" />
          <div class="name">{{ item.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dial-root {
  min-width: 200px;
  max-width: 200px;
  background: rgba(24, 28, 70, 0.92);
  border-left: 1px solid #2c2f4a;
  color: #fff;
  overflow-y: auto;
  height: 100vh;
  border-radius: 0 18px 18px 0;
  margin: 0 0 32px 0;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.17);
  display: block; /* 竖向排布分组 */
  padding-top: 24px;
}
.dial-root::-webkit-scrollbar {
  width: 8px;
}
.dial-root::-webkit-scrollbar-track {
  background: transparent;
}
.dial-root::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
}
.dial-root::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
.dial-root {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}
.letter-float {
  position: sticky;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  background: rgba(0, 0, 0, 0.35);
  padding: 6px 14px;
  border-radius: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  display: inline-flex; /* 让背景按内容收缩 */
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 90%;
  pointer-events: none; /* 不拦截滚动 */
}
.group {
  width: 100%;
}
.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  color: #cfe8ff;
  opacity: 0.95;
  font-size: 12px;
  font-weight: 700;
}
.list {
  width: 100%;
  display: block; /* 单列竖向 */
  padding: 8px 0 16px 0;
}
.item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  user-select: none;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.name {
  margin-top: 8px;
  font-size: 12px;
  color: #cfd8dc;
}
</style>
