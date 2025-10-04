# Electron IPC APIs

## 概述

TellYou 应用使用 Electron 的 IPC (Inter-Process Communication) 机制实现主进程和渲染进程之间的通信。本文档详细介绍了所有可用的 IPC API 接口。

## API 分类

### 1. 数据存储 APIs

### 2. WebSocket 通信 APIs

### 3. 数据库操作 APIs

### 4. 会话管理 APIs

### 5. 应用管理 APIs

### 6. 黑名单管理 APIs

## 数据存储 APIs

### store-get

获取存储的数据。

```typescript
// 渲染进程调用
const value = await window.electronAPI.invoke('store-get', key: string)

// 主进程处理
ipcMain.handle('store-get', (_, key) => {
  return store.get(key)
})
```

**参数**:

- `key` (string): 存储键名

**返回值**:

- `any`: 存储的值，如果不存在返回 `undefined`

**示例**:

```typescript
// 获取用户信息
const userInfo = await window.electronAPI.invoke('store-get', 'userInfo')

// 获取应用设置
const settings = await window.electronAPI.invoke('store-get', 'appSettings')
```

### store-set

设置存储的数据。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke('store-set', key: string, value: any)

// 主进程处理
ipcMain.handle('store-set', (_, key, value) => {
  store.set(key, value)
  return true
})
```

**参数**:

- `key` (string): 存储键名
- `value` (any): 要存储的值

**返回值**:

- `boolean`: 操作是否成功

**示例**:

```typescript
// 保存用户信息
await window.electronAPI.invoke('store-set', 'userInfo', {
  id: '123',
  name: '张三',
  avatar: 'https://example.com/avatar.jpg'
})

// 保存应用设置
await window.electronAPI.invoke('store-set', 'appSettings', {
  theme: 'dark',
  language: 'zh-CN',
  notifications: true
})
```

### store-delete

删除存储的数据。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke('store-delete', key: string)

// 主进程处理
ipcMain.handle('store-delete', (_, key) => {
  store.delete(key)
  return true
})
```

**参数**:

- `key` (string): 要删除的存储键名

**返回值**:

- `boolean`: 操作是否成功

### store-clear

清空所有存储的数据。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke('store-clear')

// 主进程处理
ipcMain.handle('store-clear', () => {
  store.clear()
  return true
})
```

**返回值**:

- `boolean`: 操作是否成功

## WebSocket 通信 APIs

### ws-send

通过 WebSocket 发送消息。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke('ws-send', message: any)

// 主进程处理
ipcMain.handle('ws-send', async (_, msg) => {
  try {
    sendText(msg)
    return true
  } catch (error) {
    console.error('发送消息失败:', error)
    return false
  }
})
```

**参数**:

- `message` (any): 要发送的消息对象

**返回值**:

- `boolean`: 发送是否成功

**示例**:

```typescript
// 发送聊天消息
const message = {
  type: 'CHAT_MESSAGE',
  data: {
    sessionId: 'session123',
    content: 'Hello World',
    messageType: 1,
    timestamp: new Date().toISOString()
  }
}

const success = await window.electronAPI.invoke('ws-send', message)
if (success) {
  console.log('消息发送成功')
} else {
  console.error('消息发送失败')
}
```

## 数据库操作 APIs

### get-sessions-with-order

获取按顺序排列的会话列表。

```typescript
// 渲染进程调用
const sessions = await window.electronAPI.invoke('get-sessions-with-order')

// 主进程处理
ipcMain.handle('get-sessions-with-order', async () => {
  try {
    const sql = `
      SELECT *
      FROM sessions
      WHERE contact_type IN (1, 2)
      ORDER BY is_pinned DESC, last_msg_time DESC
    `
    const result = await queryAll(sql, [])
    return result
  } catch (error) {
    console.error('获取会话列表失败:', error)
    return []
  }
})
```

**返回值**:

- `Session[]`: 会话列表数组

**Session 对象结构**:

```typescript
interface Session {
  session_id: string
  contact_type: number // 1: 好友, 2: 群组
  contact_id: string
  last_msg_content: string
  last_msg_time: string
  is_pinned: number // 0: 未置顶, 1: 已置顶
  unread_count: number
  created_at: string
  updated_at: string
}
```

### update-session-last-message

更新会话的最后一条消息。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke(
  'update-session-last-message',
  sessionId: string | number,
  content: string,
  time: Date
)

// 主进程处理
ipcMain.handle('update-session-last-message', async (_, sessionId, content, time) => {
  try {
    const sql = `
      UPDATE sessions
      SET last_msg_content = ?,
          last_msg_time    = ?,
          updated_at       = ?
      WHERE session_id = ?
    `
    const result = await sqliteRun(sql, [
      content,
      time.toISOString(),
      new Date().toISOString(),
      String(sessionId)
    ])
    return result > 0
  } catch (error) {
    console.error('更新会话最后消息失败:', error)
    return false
  }
})
```

**参数**:

- `sessionId` (string | number): 会话ID
- `content` (string): 消息内容
- `time` (Date): 消息时间

**返回值**:

- `boolean`: 更新是否成功

### toggle-session-pin

切换会话的置顶状态。

```typescript
// 渲染进程调用
const success = await window.electronAPI.invoke('toggle-session-pin', sessionId: string | number)

// 主进程处理
ipcMain.handle('toggle-session-pin', async (_, sessionId) => {
  try {
    const sql = `
      UPDATE sessions
      SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END
      WHERE session_id = ?
    `
    const result = await sqliteRun(sql, [String(sessionId)])
    return result > 0
  } catch (error) {
    console.error('切换置顶状态失败:', error)
    return false
  }
})
```

**参数**:

- `sessionId` (string | number): 会话ID

**返回值**:

- `boolean`: 操作是否成功

### get-message-by-sessionId

根据会话ID获取消息列表。

```typescript
// 渲染进程调用
const messages = await window.electronAPI.invoke(
  'get-message-by-sessionId',
  sessionId: string | number,
  options: MessageQueryOptions
)

// 主进程处理
ipcMain.handle('get-message-by-sessionId', (_, sessionId, options) => {
  return getMessageBySessionId(String(sessionId), options)
})
```

**参数**:

- `sessionId` (string | number): 会话ID
- `options` (MessageQueryOptions): 查询选项

**MessageQueryOptions 结构**:

```typescript
interface MessageQueryOptions {
  pageNo?: number // 页码，默认 1
  pageSize?: number // 每页大小，默认 20
  messageType?: number // 消息类型过滤
  startTime?: string // 开始时间
  endTime?: string // 结束时间
}
```

**返回值**:

- `Message[]`: 消息列表

**Message 对象结构**:

```typescript
interface Message {
  id: string
  session_id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: number
  timestamp: string
  status: number
  extra: string // JSON 字符串
}
```

## 应用管理 APIs

### application:incoming:load

加载收到的好友申请列表。

```typescript
// 渲染进程调用
window.electronAPI.send('application:incoming:load', {
  pageNo: number,
  pageSize: number
})

// 监听响应
window.electronAPI.on('application:incoming:loaded', (data) => {
  console.log('收到的好友申请:', data)
})

// 主进程处理
ipcMain.on('application:incoming:load', async (event, { pageNo, pageSize }) => {
  const { loadIncomingApplications } = await import('@main/sqlite/dao/application-dao')
  const data = await loadIncomingApplications(pageNo, pageSize)
  event.sender.send('application:incoming:loaded', data)
})
```

**参数**:

- `pageNo` (number): 页码
- `pageSize` (number): 每页大小

**响应数据**:

```typescript
interface ApplicationData {
  applications: Application[]
  total: number
  pageNo: number
  pageSize: number
}

interface Application {
  id: string
  from_user_id: string
  to_user_id: string
  remark: string
  status: number // 0: 待处理, 1: 已同意, 2: 已拒绝
  created_at: string
  updated_at: string
}
```

### application:incoming:approve

同意好友申请。

```typescript
// 渲染进程调用
window.electronAPI.send('application:incoming:approve', {
  ids: string[]
})

// 主进程处理
ipcMain.on('application:incoming:approve', async (event, { ids }) => {
  const { approveIncoming } = await import('@main/sqlite/dao/application-dao')
  await approveIncoming(ids || [])
})
```

**参数**:

- `ids` (string[]): 要同意的申请ID数组

### application:incoming:reject

拒绝好友申请。

```typescript
// 渲染进程调用
window.electronAPI.send('application:incoming:reject', {
  ids: string[]
})

// 主进程处理
ipcMain.on('application:incoming:reject', async (event, { ids }) => {
  const { rejectIncoming } = await import('@main/sqlite/dao/application-dao')
  await rejectIncoming(ids || [])
})
```

**参数**:

- `ids` (string[]): 要拒绝的申请ID数组

### application:outgoing:load

加载发送的好友申请列表。

```typescript
// 渲染进程调用
window.electronAPI.send('application:outgoing:load', {
  pageNo: number,
  pageSize: number
})

// 监听响应
window.electronAPI.on('application:outgoing:loaded', (data) => {
  console.log('发送的好友申请:', data)
})
```

### application:outgoing:cancel

取消好友申请。

```typescript
// 渲染进程调用
window.electronAPI.send('application:outgoing:cancel', {
  ids: string[]
})
```

### application:send

发送好友申请。

```typescript
// 渲染进程调用
window.electronAPI.send('application:send', {
  toUserId: string,
  remark: string
})

// 主进程处理
ipcMain.on('application:send', async (event, { toUserId, remark }) => {
  const { insertApplication } = await import('@main/sqlite/dao/application-dao')
  await insertApplication('', toUserId, remark) // TODO: 获取当前用户ID
})
```

**参数**:

- `toUserId` (string): 目标用户ID
- `remark` (string): 申请备注

## 黑名单管理 APIs

### black:list:load

加载黑名单列表。

```typescript
// 渲染进程调用
window.electronAPI.send('black:list:load', {
  pageNo: number,
  pageSize: number
})

// 监听响应
window.electronAPI.on('black:list:loaded', (data) => {
  console.log('黑名单列表:', data)
})

// 主进程处理
ipcMain.on('black:list:load', async (event, { pageNo, pageSize }) => {
  const { loadBlacklist } = await import('@main/sqlite/dao/black-dao')
  const data = await loadBlacklist(pageNo, pageSize)
  event.sender.send('black:list:loaded', data)
})
```

**响应数据**:

```typescript
interface BlacklistData {
  blacklist: BlacklistItem[]
  total: number
  pageNo: number
  pageSize: number
}

interface BlacklistItem {
  id: string
  user_id: string
  blocked_user_id: string
  created_at: string
  updated_at: string
}
```

### black:list:remove

从黑名单中移除用户。

```typescript
// 渲染进程调用
window.electronAPI.send('black:list:remove', {
  userIds: string[]
})

// 主进程处理
ipcMain.on('black:list:remove', async (event, { userIds }) => {
  const { removeFromBlacklist } = await import('@main/sqlite/dao/black-dao')
  await removeFromBlacklist(userIds || [])
})
```

**参数**:

- `userIds` (string[]): 要移除的用户ID数组

## 窗口控制 APIs

### window-ChangeScreen

控制窗口状态。

```typescript
// 渲染进程调用
window.electronAPI.send('window-ChangeScreen', status: number)

// 主进程处理
onScreenChange((event: Electron.IpcMainEvent, status: number) => {
  const webContents = event.sender
  const win = BrowserWindow.fromWebContents(webContents)

  switch (status) {
    case 0: // 切换置顶状态
      if (win?.isAlwaysOnTop()) {
        win?.setAlwaysOnTop(false)
      } else {
        win?.setAlwaysOnTop(true)
      }
      break
    case 1: // 最小化
      win?.minimize()
      break
    case 2: // 最大化/还原
      if (win?.isMaximized()) {
        win?.unmaximize()
      } else {
        win?.maximize()
      }
      break
    case 3: // 隐藏到系统托盘
      win?.setSkipTaskbar(true)
      win?.hide()
      break
  }
})
```

**参数**:

- `status` (number): 窗口状态
  - `0`: 切换置顶状态
  - `1`: 最小化窗口
  - `2`: 最大化/还原窗口
  - `3`: 隐藏到系统托盘

## 使用示例

### 在 Vue 组件中使用

```vue
<template>
  <div class="chat-container">
    <!-- 聊天界面 -->
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

// 获取会话列表
const loadSessions = async () => {
  try {
    const sessions = await window.electronAPI.invoke('get-sessions-with-order')
    console.log('会话列表:', sessions)
  } catch (error) {
    console.error('加载会话失败:', error)
  }
}

// 发送消息
const sendMessage = async (content: string) => {
  const message = {
    type: 'CHAT_MESSAGE',
    data: {
      sessionId: 'current-session-id',
      content,
      messageType: 1,
      timestamp: new Date().toISOString()
    }
  }

  const success = await window.electronAPI.invoke('ws-send', message)
  if (success) {
    console.log('消息发送成功')
  }
}

// 监听新消息
const handleNewMessage = (message: any) => {
  console.log('收到新消息:', message)
}

onMounted(() => {
  // 加载初始数据
  loadSessions()

  // 监听消息事件
  window.electronAPI.on('new-message', handleNewMessage)
})

onUnmounted(() => {
  // 清理事件监听
  window.electronAPI.removeListener('new-message', handleNewMessage)
})
</script>
```

### 在 Store 中使用

```typescript
// src/renderer/src/status/message/store.ts
export const useMessageStore = defineStore('message', {
  actions: {
    async loadSessions() {
      try {
        const sessions = await window.electronAPI.invoke('get-sessions-with-order')
        this.sessions = sessions
      } catch (error) {
        console.error('加载会话失败:', error)
      }
    },

    async sendMessage(content: string, sessionId: string) {
      const message = {
        type: 'CHAT_MESSAGE',
        data: {
          sessionId,
          content,
          messageType: 1,
          timestamp: new Date().toISOString()
        }
      }

      return await window.electronAPI.invoke('ws-send', message)
    },

    async toggleSessionPin(sessionId: string) {
      return await window.electronAPI.invoke('toggle-session-pin', sessionId)
    }
  }
})
```

## 错误处理

### 统一错误处理

```typescript
// 封装 IPC 调用
const safeInvoke = async (channel: string, ...args: any[]) => {
  try {
    return await window.electronAPI.invoke(channel, ...args)
  } catch (error) {
    console.error(`IPC 调用失败 [${channel}]:`, error)
    throw error
  }
}

// 使用示例
const loadSessions = async () => {
  try {
    const sessions = await safeInvoke('get-sessions-with-order')
    return sessions
  } catch (error) {
    // 处理错误
    showErrorMessage('加载会话列表失败')
    return []
  }
}
```

### 超时处理

```typescript
const invokeWithTimeout = async (channel: string, timeout: number, ...args: any[]) => {
  const promise = window.electronAPI.invoke(channel, ...args)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('操作超时')), timeout)
  })

  return Promise.race([promise, timeoutPromise])
}
```

## 最佳实践

### 1. 类型安全

```typescript
// 定义 IPC 接口类型
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  send: (channel: string, ...args: any[]) => void
  on: (channel: string, listener: (...args: any[]) => void) => void
  removeListener: (channel: string, listener: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 2. 错误边界

```typescript
// 在组件中使用错误边界
const handleIpcError = (error: Error, context: string) => {
  console.error(`IPC 错误 [${context}]:`, error)
  // 显示用户友好的错误信息
  showNotification({
    type: 'error',
    message: '操作失败，请重试'
  })
}
```

### 3. 性能优化

```typescript
// 批量操作
const batchUpdateSessions = async (updates: SessionUpdate[]) => {
  const promises = updates.map((update) =>
    window.electronAPI.invoke(
      'update-session-last-message',
      update.sessionId,
      update.content,
      update.time
    )
  )

  await Promise.all(promises)
}
```

---

这些 IPC APIs 为 TellYou 应用提供了完整的主进程和渲染进程通信能力，支持数据存储、实时通信、数据库操作等核心功能。
