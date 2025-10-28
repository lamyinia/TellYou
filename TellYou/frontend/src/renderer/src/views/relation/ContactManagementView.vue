<script setup lang="ts">
import { ref, watch } from "vue";
import ContactDial from "./ContactDial.vue";
import ContactDetail from "./ContactDetail.vue";
import ContactApplication from "./apply/ContactApplication.vue";
import CreatedGroup from "./group/CreatedGroup.vue";
import ContactBlack from "./black/ContactBlack.vue";
import { useSessionStore } from "@renderer/status/session/store";

export interface SimpleContact {
  id: string;
  name: string;
  avatar?: string;
  sessionId: string;
}
export interface DetailContact {
  sessionId: string;
  name: string;
  avatar?: string;
  signature?: string;
  sex?: string;
}

const activeTab = ref<string>("");

const sessionStore = useSessionStore();
const selectedContact = ref<DetailContact | null>(null);

const selectContact = async (sessionId: string): Promise<void> => {
  let session: any = sessionStore.getSession(sessionId);
  const data: any = await window.electronAPI.invoke(
    "proxy:search:user-or-group",
    { contactId: session.contactId, contactType: session.contactType },
  );
  console.log(data);
  await sessionStore.updateSession(sessionId, {
    contactName: data.nickname,
    contactAvatar: data.avatar,
    contactSignature: data.signature,
  });
  selectedContact.value = {
    name: data.nickname,
    avatar: data.avatar,
    signature: data.signature,
    sex: data.sex === 0 ? "女" : "男",
    sessionId: sessionId,
  };
};
const toggleTab = (newValue: string): void => {
  if (newValue === activeTab.value) {
    activeTab.value = "";
  } else {
    activeTab.value = newValue;
  }
};
watch(
  activeTab,
  (newV, oldV) => {
    console.log("contact-management-view-watch:", oldV, " to ", newV);
  },
  { immediate: true },
);
</script>

<template>
  <div class="cm-container">
    <div class="cm-main">
      <div class="cm-left">
        <div class="cm-left-inner">
          <ContactDetail :contact="selectedContact" />
        </div>
      </div>
      <ContactDial @select="selectContact" />
      <ContactApplication :out-tab="activeTab" @toggle="toggleTab" />
      <CreatedGroup :out-tab="activeTab" @toggle="toggleTab" />
      <ContactBlack :out-tab="activeTab" @toggle="toggleTab" />
    </div>
  </div>
</template>

<style scoped>
.cm-container {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a237e 0%, #0d133d 100%);
}
.cm-main {
  display: flex;
  height: 100vh;
}
.cm-left {
  flex: 1;
  min-width: 0;
  background: rgba(20, 24, 60, 0.85);
  border-radius: 18px 0 0 18px;
  margin: 0 0 32px 0;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  overflow: hidden;
  display: flex;
}
.cm-left-inner {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cfd8dc;
}
.cm-detail {
  width: 100%;
  padding: 24px 32px;
}
.cm-header {
  display: flex;
  align-items: center;
}
.cm-avatar-lg {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5c6bc0, #7986cb);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.cm-summary {
  margin-left: 16px;
}
.cm-nickname {
  font-size: 20px;
  font-weight: 700;
}
.cm-remark,
.cm-id {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}
.cm-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}
.ml-2 {
  margin-left: 8px;
}
.cm-info {
  margin-top: 24px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 12px 16px;
}
.cm-info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.cm-info-item:last-child {
  border-bottom: none;
}
.cm-empty {
  opacity: 0.7;
}
.cm-right {
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
  display: flex;
  align-items: flex-start;
  padding-top: 24px;
}
.cm-letter-float {
  position: sticky;
  top: 8px;
  margin-left: auto;
  margin-right: 8px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 8px;
  border-radius: 8px;
  font-weight: 700;
}
.cm-group {
  width: 100%;
}
.cm-group-header {
  width: 100%;
  padding: 4px 12px;
  color: #90caf9;
  opacity: 0.9;
  font-size: 12px;
}
.cm-list {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 8px 0 16px 0;
  align-items: start;
  justify-items: center;
}
.cm-item {
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  user-select: none;
}
.cm-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3949ab, #5c6bc0);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.cm-name {
  margin-top: 8px;
  font-size: 12px;
  color: #cfd8dc;
}
</style>
