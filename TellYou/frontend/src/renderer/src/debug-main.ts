/* eslint-disable */

import { createApp } from "vue"
import Debug from "./debug/Debug.vue"

// 创建独立的调试应用，不包含主应用的路由和组件
const app = createApp(Debug)

app.mount("#debug-app")
