<script setup lang="ts">
/* eslint-disable */

import { ref, watch } from "vue";
import ContactDial from "./ContactDial.vue";
import ContactDetail from "./ContactDetail.vue";
import ContactApplication from "./apply/ContactApplication.vue";
import CreatedGroup from "./group/GroupManagement.vue";
import ContactBlack from "./black/ContactBlack.vue";
import { useSessionStore } from "@renderer/status/session/store";

export interface SimpleContact {
  id: string,
  name: string,
  avatar?: string,
  sessionId: string,
  contactType: number
}
export interface DetailContact {
  sessionId: string,
  contactType: number,
  name: string,
  avatar?: string,
  signature?: string,
  sex?: string,
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

</style>
