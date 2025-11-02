<template>
  <div v-if="visible" class="emoji-picker-overlay" @click="handleOverlayClick">
    <div class="emoji-picker" @click.stop>
      <div class="emoji-header">
        <div class="emoji-tabs">
          <button
            v-for="(category, index) in emojiCategories"
            :key="index"
            :class="['tab-btn', { active: activeTab === index }]"
            @click="activeTab = index"
          >
            {{ category.name }}
          </button>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </button>
      </div>
      
      <div class="emoji-content">
        <div class="emoji-grid">
          <button
            v-for="emoji in emojiCategories[activeTab]?.emojiList || []"
            :key="emoji"
            class="emoji-btn"
            @click="selectEmoji(emoji)"
            :title="emoji"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable */

import { ref } from "vue"
import emojiList from "@renderer/utils/emoji"

interface Props {
  visible: boolean
}

interface Emits {
  (e: "select", emoji: string): void
  (e: "close"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = ref(0)
const emojiCategories = emojiList

const selectEmoji = (emoji: string) => {
  emit("select", emoji)
  emit("close")
}

const handleOverlayClick = () => {
  emit("close")
}
</script>

<style scoped>
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.emoji-picker {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 60vh;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.emoji-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.emoji-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #1976d2;
  color: white;
}

.tab-btn:hover:not(.active) {
  background: #e3f2fd;
}

.close-btn {
  padding: 4px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #e0e0e0;
}

.emoji-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: #f0f0f0;
  transform: scale(1.1);
}

.emoji-btn:active {
  transform: scale(0.95);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .emoji-picker {
    max-height: 50vh;
  }
  
  .emoji-grid {
    grid-template-columns: repeat(6, 1fr);
  }
  
  .emoji-btn {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}
</style>
