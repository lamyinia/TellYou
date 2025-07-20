<script setup lang="ts">
import RightNavBar from '../components/RightNavBar.vue'

</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="main-container" style="padding:0; height:100vh;">
        <v-row no-gutters style="height:100%;">
          <v-col style="height:100%;">
            <router-view />
          </v-col>
          <v-col cols="auto">
            <RightNavBar />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>

.main-container {
  height: 100vh;
  overflow: hidden;
}

</style>
