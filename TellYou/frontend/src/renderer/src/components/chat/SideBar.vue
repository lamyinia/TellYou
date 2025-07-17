<template>
  <div class="sidebar">
    <v-list nav dense>
      <v-list-item link>
        <v-icon color="green">mdi-message</v-icon>
      </v-list-item>
      <v-list-item link>
        <v-icon color="grey">mdi-account-group</v-icon>
      </v-list-item>
      <v-list-item link>
        <v-icon color="grey">mdi-layers</v-icon>
      </v-list-item>
      <v-list-item link>
        <v-icon color="grey">mdi-folder</v-icon>
      </v-list-item>
      <v-spacer />
      <v-list-item link>
        <v-icon color="grey">mdi-cog</v-icon>
      </v-list-item>
    </v-list>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>
.sidebar {
  position: fixed;    
  right: 0;
  top: 0;
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  height: 100vh;
  background: #222 !important; 
  border-left: 1px solid #eee;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
</style>
