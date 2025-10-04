# 编码规范

## 概述

本文档定义了 TellYou 前端项目的编码规范和最佳实践，旨在确保代码质量、可维护性和团队协作效率。

## 通用规范

### 1. 代码风格

#### 缩进和空格

- 使用 **2 个空格** 进行缩进，不使用 Tab
- 行尾不留空格
- 文件末尾保留一个空行

#### 行长度

- 每行代码不超过 **100 个字符**
- 长语句适当换行，保持可读性

#### 命名规范

- **变量和函数**: 使用 camelCase
- **常量**: 使用 UPPER_SNAKE_CASE
- **类名**: 使用 PascalCase
- **文件名**: 使用 kebab-case (Vue 组件) 或 camelCase (TypeScript 文件)

```typescript
// ✅ 正确
const userName = '张三'
const MAX_RETRY_COUNT = 3
class UserService {}
const user-profile.vue

// ❌ 错误
const user_name = '张三'
const maxRetryCount = 3
class userService {}
const UserProfile.vue
```

### 2. 注释规范

#### 文件头注释

```typescript
/**
 * @fileoverview 用户认证相关功能
 * @author 开发者姓名
 * @date 2024-01-01
 */
```

#### 函数注释

```typescript
/**
 * 发送聊天消息
 * @param content 消息内容
 * @param sessionId 会话ID
 * @param messageType 消息类型 (1:文本, 2:图片, 3:文件)
 * @returns Promise<boolean> 发送是否成功
 */
async function sendMessage(
  content: string,
  sessionId: string,
  messageType: number
): Promise<boolean> {
  // 实现逻辑
}
```

#### 复杂逻辑注释

```typescript
// 计算消息显示时间
// 如果是今天，显示时间；如果是昨天，显示"昨天"；否则显示日期
const getDisplayTime = (timestamp: Date): string => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate())

  if (messageDate.getTime() === today.getTime()) {
    // 今天：显示时间
    return timestamp.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } else if (messageDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    // 昨天：显示"昨天"
    return '昨天'
  } else {
    // 其他：显示日期
    return timestamp.toLocaleDateString('zh-CN')
  }
}
```

## TypeScript 规范

### 1. 类型定义

#### 接口定义

```typescript
// ✅ 使用 interface 定义对象结构
interface User {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'offline' | 'busy' | 'away'
  lastActiveTime: Date
}

// ✅ 使用 type 定义联合类型或复杂类型
type MessageType = 'text' | 'image' | 'file' | 'voice'
type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}
```

#### 泛型使用

```typescript
// ✅ 正确使用泛型
interface Repository<T> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<T>
  delete(id: string): Promise<boolean>
}

class UserRepository implements Repository<User> {
  async findById(id: string): Promise<User | null> {
    // 实现逻辑
  }
}
```

### 2. 类型安全

#### 严格类型检查

```typescript
// ✅ 明确类型声明
const message: Message = {
  id: generateId(),
  content: 'Hello',
  timestamp: new Date(),
  messageType: 1
}

// ✅ 类型断言（谨慎使用）
const userElement = document.getElementById('user') as HTMLInputElement

// ✅ 类型守卫
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string'
}
```

#### 可选属性处理

```typescript
// ✅ 正确处理可选属性
interface Message {
  id: string
  content: string
  extra?: {
    fileName?: string
    fileSize?: number
  }
}

function processMessage(message: Message) {
  // 检查可选属性
  if (message.extra?.fileName) {
    console.log('文件名:', message.extra.fileName)
  }
}
```

### 3. 错误处理

```typescript
// ✅ 使用 Result 模式处理错误
type Result<T, E = Error> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: E
    }

async function sendMessage(content: string): Promise<Result<Message>> {
  try {
    const message = await api.sendMessage(content)
    return { success: true, data: message }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('发送失败')
    }
  }
}
```

## Vue 3 规范

### 1. 组件结构

#### 组件文件结构

```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 导入
import { ref, computed, onMounted } from 'vue'
import { useMessageStore } from '@/status/message/store'

// 接口定义
interface Props {
  sessionId: string
  placeholder?: string
}

// Props 定义
const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入消息...'
})

// Emits 定义
const emit = defineEmits<{
  send: [message: string]
  focus: []
}>()

// 响应式数据
const messageContent = ref('')
const isLoading = ref(false)

// 计算属性
const canSend = computed(() => {
  return messageContent.value.trim().length > 0 && !isLoading.value
})

// 方法
const handleSend = () => {
  if (canSend.value) {
    emit('send', messageContent.value)
    messageContent.value = ''
  }
}

// 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<style scoped>
/* 样式定义 */
</style>
```

### 2. Composition API 使用

#### 响应式数据

```typescript
// ✅ 使用 ref 处理基本类型
const count = ref(0)
const message = ref('')

// ✅ 使用 reactive 处理对象
const user = reactive({
  id: '',
  name: '',
  avatar: ''
})

// ✅ 使用 computed 处理计算属性
const displayName = computed(() => {
  return user.name || '匿名用户'
})
```

#### 生命周期钩子

```typescript
// ✅ 正确使用生命周期
onMounted(async () => {
  await loadInitialData()
})

onUnmounted(() => {
  // 清理资源
  cleanup()
})

onBeforeUnmount(() => {
  // 保存数据
  saveUserPreferences()
})
```

### 3. 组件通信

#### Props 和 Emits

```vue
<!-- 父组件 -->
<template>
  <MessageInput
    :session-id="currentSessionId"
    :placeholder="inputPlaceholder"
    @send="handleMessageSend"
    @focus="handleInputFocus"
  />
</template>

<script setup lang="ts">
const handleMessageSend = (message: string) => {
  console.log('收到消息:', message)
}

const handleInputFocus = () => {
  console.log('输入框获得焦点')
}
</script>
```

#### 依赖注入

```typescript
// ✅ 提供依赖
const messageService = new MessageService()
provide('messageService', messageService)

// ✅ 注入依赖
const messageService = inject<MessageService>('messageService')
if (!messageService) {
  throw new Error('MessageService 未提供')
}
```

## 状态管理规范

### 1. Pinia Store 结构

```typescript
// src/status/message/store.ts
import { defineStore } from 'pinia'
import type { Message, Session } from '@/types'

export const useMessageStore = defineStore('message', {
  state: () => ({
    // 状态定义
    messages: new Map<string, Message[]>(),
    currentSessionId: '',
    loading: false,
    error: null as string | null
  }),

  getters: {
    // 计算属性
    currentMessages: (state) => {
      return state.messages.get(state.currentSessionId) || []
    },

    unreadCount: (state) => {
      return Array.from(state.messages.values())
        .flat()
        .filter((msg) => !msg.isRead).length
    }
  },

  actions: {
    // 异步操作
    async loadMessages(sessionId: string) {
      this.loading = true
      this.error = null

      try {
        const messages = await window.electronAPI.invoke('get-message-by-sessionId', sessionId, {
          pageNo: 1,
          pageSize: 20
        })

        this.messages.set(sessionId, messages)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 同步操作
    addMessage(message: Message) {
      const sessionMessages = this.messages.get(message.sessionId) || []
      sessionMessages.push(message)
      this.messages.set(message.sessionId, sessionMessages)
    },

    // 重置状态
    reset() {
      this.messages.clear()
      this.currentSessionId = ''
      this.loading = false
      this.error = null
    }
  }
})
```

### 2. Store 使用规范

```typescript
// ✅ 在组件中使用 Store
import { useMessageStore } from '@/status/message/store'

const messageStore = useMessageStore()

// ✅ 解构响应式状态
const { currentMessages, loading } = storeToRefs(messageStore)

// ✅ 调用 actions
const handleSendMessage = async (content: string) => {
  try {
    await messageStore.sendMessage(content)
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}
```

## 样式规范

### 1. CSS 类命名

#### BEM 命名法

```scss
// ✅ 使用 BEM 命名
.message-list {
  &__item {
    &--active {
      background-color: #f0f0f0;
    }
  }

  &__content {
    &--own {
      text-align: right;
    }
  }
}

// ❌ 避免深层嵌套
.message-list .item .content .text {
  // 过于深层，难以维护
}
```

#### 语义化类名

```scss
// ✅ 语义化命名
.chat-container {
}
.message-bubble {
}
.user-avatar {
}
.status-indicator {
}

// ❌ 避免无意义命名
.box1 {
}
.red-text {
}
.big-button {
}
```

### 2. 样式组织

#### 组件样式结构

```scss
<style scoped>
// 1. 变量定义
$primary-color: #4CAF50;
$border-radius: 8px;
$spacing-unit: 8px;

// 2. 基础样式
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

// 3. 子组件样式
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-unit;

  &__item {
    margin-bottom: $spacing-unit;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

// 4. 状态样式
.message-bubble {
  &--own {
    background-color: $primary-color;
    color: white;
  }

  &--loading {
    opacity: 0.6;
  }
}

// 5. 响应式样式
@media (max-width: 768px) {
  .chat-container {
    padding: $spacing-unit / 2;
  }
}
</style>
```

### 3. CSS 变量使用

```scss
// ✅ 使用 CSS 变量
:root {
  --primary-color: #4caf50;
  --secondary-color: #2196f3;
  --text-color: #333;
  --border-color: #e0e0e0;
  --border-radius: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

.message-bubble {
  background-color: var(--primary-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-color);
}
```

## 错误处理规范

### 1. 组件错误处理

```vue
<template>
  <div class="message-container">
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="retry">重试</button>
    </div>

    <div v-else-if="loading" class="loading">加载中...</div>

    <div v-else class="message-list">
      <!-- 消息列表 -->
    </div>
  </div>
</template>

<script setup lang="ts">
const error = ref<string | null>(null)
const loading = ref(false)

const loadMessages = async () => {
  loading.value = true
  error.value = null

  try {
    await messageStore.loadMessages(sessionId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const retry = () => {
  loadMessages()
}
</script>
```

### 2. 全局错误处理

```typescript
// src/utils/error-handler.ts
export class ErrorHandler {
  static handle(error: unknown, context: string) {
    console.error(`[${context}] 错误:`, error)

    // 发送错误报告
    this.reportError(error, context)

    // 显示用户友好的错误信息
    this.showUserError(error)
  }

  private static reportError(error: unknown, context: string) {
    // 发送到错误监控服务
    if (process.env.NODE_ENV === 'production') {
      // 发送错误报告
    }
  }

  private static showUserError(error: unknown) {
    const message = this.getErrorMessage(error)
    // 显示通知
    showNotification({
      type: 'error',
      message
    })
  }

  private static getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    return '操作失败，请重试'
  }
}
```

## 性能优化规范

### 1. 组件优化

```vue
<script setup lang="ts">
// ✅ 使用 shallowRef 处理大型对象
const largeData = shallowRef<LargeObject>()

// ✅ 使用 computed 缓存计算结果
const expensiveValue = computed(() => {
  return heavyCalculation(props.data)
})

// ✅ 使用 watchEffect 处理副作用
watchEffect(() => {
  if (props.sessionId) {
    loadMessages(props.sessionId)
  }
})
</script>
```

### 2. 列表优化

```vue
<template>
  <!-- ✅ 使用 v-memo 优化列表渲染 -->
  <div
    v-for="message in messages"
    :key="message.id"
    v-memo="[message.id, message.content, message.timestamp]"
    class="message-item"
  >
    <MessageComponent :message="message" />
  </div>
</template>
```

### 3. 异步操作优化

```typescript
// ✅ 使用 AbortController 取消请求
const abortController = new AbortController()

const loadData = async () => {
  try {
    const data = await fetch('/api/data', {
      signal: abortController.signal
    })
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('请求已取消')
    } else {
      throw error
    }
  }
}

// 组件卸载时取消请求
onUnmounted(() => {
  abortController.abort()
})
```

## 测试规范

### 1. 单元测试

```typescript
// tests/components/MessageInput.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import MessageInput from '@/components/MessageInput.vue'

describe('MessageInput', () => {
  it('should emit send event when message is sent', async () => {
    const wrapper = mount(MessageInput, {
      props: {
        sessionId: 'test-session'
      }
    })

    const input = wrapper.find('textarea')
    await input.setValue('Hello World')

    const sendButton = wrapper.find('[data-testid="send-button"]')
    await sendButton.trigger('click')

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')?.[0]).toEqual(['Hello World'])
  })

  it('should not send empty message', async () => {
    const wrapper = mount(MessageInput)

    const sendButton = wrapper.find('[data-testid="send-button"]')
    await sendButton.trigger('click')

    expect(wrapper.emitted('send')).toBeFalsy()
  })
})
```

### 2. 集成测试

```typescript
// tests/integration/chat.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMessageStore } from '@/status/message/store'

describe('Chat Integration', () => {
  beforeEach(() => {
    // 重置 store
    const store = useMessageStore()
    store.reset()
  })

  it('should load and display messages', async () => {
    const store = useMessageStore()

    // 模拟加载消息
    await store.loadMessages('test-session')

    expect(store.currentMessages).toHaveLength(2)
    expect(store.loading).toBe(false)
  })
})
```

## 代码审查清单

### 1. 功能正确性

- [ ] 功能是否按预期工作
- [ ] 边界条件是否处理
- [ ] 错误情况是否处理
- [ ] 性能是否满足要求

### 2. 代码质量

- [ ] 代码是否遵循编码规范
- [ ] 变量和函数命名是否清晰
- [ ] 代码是否有适当的注释
- [ ] 是否有重复代码

### 3. 安全性

- [ ] 输入验证是否充分
- [ ] 敏感信息是否安全处理
- [ ] 是否有安全漏洞

### 4. 可维护性

- [ ] 代码结构是否清晰
- [ ] 组件职责是否单一
- [ ] 是否易于测试
- [ ] 是否易于扩展

## 工具配置

### 1. ESLint 配置

```json
// .eslintrc.json
{
  "extends": ["@vue/typescript/recommended", "@vue/prettier"],
  "rules": {
    "no-console": "warn",
    "no-debugger": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### 2. Prettier 配置

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100
}
```

### 3. TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

遵循这些编码规范将有助于提高代码质量、可维护性和团队协作效率。建议在项目开发过程中严格执行这些规范，并在代码审查时进行检查。
