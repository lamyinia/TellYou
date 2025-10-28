import { createApp } from "vue";
import App from "./App.vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@renderer/assets/global.css";
import "@renderer/assets/icon/iconfont.css";
import "@renderer/assets/font-alibaba/iconfont.css";
import "@renderer/utils/pinyin";

import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import router from "./router/router";
import { createPinia } from "pinia";

const vuetifyBase = createVuetify({
  components,
  directives,
});

createApp(App).use(createPinia()).use(router).use(vuetifyBase).mount("#app");
