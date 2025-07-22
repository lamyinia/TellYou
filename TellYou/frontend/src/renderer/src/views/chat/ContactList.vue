<script setup lang="ts">
import updateBg from '@renderer/assets/img/update_bg.png'
const contacts = [
  { id: 1, name: '张三', avatar: '张', lastMsg: '好的，明天见！好的，明天见！', time: '14:30', active: true },
  { id: 2, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 3, name: '王五', avatar: '王', lastMsg: '[图片]', time: '12:20', active: false },
  { id: 4, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 5, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 6, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 7, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 8, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 9, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 10, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 11, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 12, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 13, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 14, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
  { id: 15, name: '李四', avatar: '李', lastMsg: '项目进展如何？', time: '13:45', active: false },
]

const emit = defineEmits(['contact-selected'])
const selectContact = (contact) => {
  console.log("this is emit selectContact")
  emit('contact-selected', contact)
}


</script>

<template>
  <div class="star-contact-bg">
    <div>
      <v-text-field
        prepend-inner-icon="iconfont icon-search"
        placeholder="搜索联系人..."
        class="star-search-field"
        hide-details
      />
    </div>
    <v-list class="star-list">
      <v-list-item v-for="item in contacts"
                   :key="item.id" @click="selectContact(item)"
                   :active="item.active">
        <div class="star-list-item-content">
          <img class="star-contact-avatar" :src="updateBg" alt="avatar" />
          <div class="star-list-item-text">
            <div class="star-list-item-title">{{ item.name }}</div>
            <div class="star-list-item-subtitle">{{ item.lastMsg }}</div>
            <div class="star-list-item-time">{{ item.time }}</div>
          </div>
        </div>
      </v-list-item>
    </v-list>
  </div>
</template>

<style scoped>
.star-contact-bg {
  height: 100%;
  border-radius: 0 18px 18px 0;
  box-shadow: 0 8px 32px 0 rgba(211, 0, 244, 0.17);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 0;
  padding-right: 0;
}
.star-search-field {
  width: 100%;
  margin: 0px 40px 20px 10px;
  border-radius: 12px;
  color: #fff !important;
  min-height: 20px !important;
  font-size: 12px;
}
.star-search-field .v-input__control,
.star-search-field .v-field,
.star-search-field .v-field__field,
.star-search-field input {
  min-height: 36px !important;
  height: 36px !important;
  line-height: 36px !important;
  color: #fff !important;
  font-size: 15px !important;
}
.star-search-field input::placeholder {
  color: #fff !important;
  opacity: 0.7;
}

.star-list {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 0 18px 0;
  padding-bottom: 12px;
}
.star-list::-webkit-scrollbar {
  width: 5px;
  background: #ba0d9c;
  border-radius: 8px;
}
.star-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #0b4c7c 0%, #061449 100%);
  border-radius: 8px;
  min-height: 40px;
}
.star-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #1d12b5 0%, #2e0c83 100%);
}
.star-list::-webkit-scrollbar-track {
  background: #181c46;
  border-radius: 8px;
}

.v-list-item {
  background: rgba(255,255,255,0.06);
  border-radius: 12px;
  margin: 4px 8px;
  transition: background 0.2s;
  padding: 0 !important;
}
.v-list-item--active {
  background: rgba(255,255,255,0.16) !important;
}
.star-list-item-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 12px;
}
.star-contact-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  margin-right: 0;
  box-shadow: 0 2px 8px 0 rgba(0,0,0,0.12);
  display: inline-block;
  object-fit: cover;
  background: #fff;
}
.star-list-item-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.star-list-item-title {
  font-size: 14px;
  color: #cdede7;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.star-list-item-subtitle {
  font-size: 14px;
  color: #eefaf5;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.star-list-item-time {
  font-size: 12px;
  color: #90a4ae;
  white-space: nowrap;
}
</style>
