# Electron 跨进程类型共享解决方案

## 问题描述

在 Electron 应用中，主进程和渲染进程是独立的 Node.js 进程，不能直接相互引用 TypeScript 类型定义。当主进程需要引用渲染进程的类型时，会出现编译错误。

### 错误示例

```typescript
// ❌ 主进程 handler.ts
import { Session } from '@renderer/status/session/class'  // 编译错误
```

**错误原因：**
1. 进程隔离：主进程和渲染进程是独立的进程
2. 安全限制：Electron 的进程隔离机制
3. 构建问题：TypeScript 编译时找不到跨进程模块

## 解决方案

### 方案一：共享类型定义（推荐）

创建共享的类型定义文件，供主进程和渲染进程共同使用。

#### 1. 创建共享类型目录

```
frontend/src/shared/
├── types/
│   ├── session.ts      # Session 相关类型
│   ├── message.ts      # Message 相关类型
│   └── index.ts        # 统一导出
└── utils/
    └── common.ts       # 共享工具函数
```

#### 2. 定义共享类型

```typescript
// frontend/src/shared/types/session.ts
export interface Session {
  sessionId: string
  contactId: string
  contactType: number
  contactName: string
  contactAvatar: string
  contactSignature: string
  lastMsgContent: string
  lastMsgTime: string
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  created_at: string
  updated_at: string
  memberCount?: number
  maxMembers?: number
  joinMode?: number
  msgMode?: number
  groupCard?: string
  groupNotification?: string
  myRole?: number
  joinTime?: string
  lastActive?: string
}
```

#### 3. 配置路径映射

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@renderer/*": ["./src/renderer/src/*"],
      "@main/*": ["./src/main/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

**electron.vite.config.ts:**
```typescript
export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    }
  }
})
```

#### 4. 使用共享类型

**主进程：**
```typescript
// frontend/src/main/websocket/handler.ts
import { Session } from '@shared/types/session'

class WebsocketHandler {
  public async handleTextMessage(msg: any, ws: WebSocket): Promise<void> {
    const session: Session = await this.getSession(msg.sessionId)
    // 使用 Session 类型
  }
}
```

**渲染进程：**
```typescript
// frontend/src/renderer/src/status/session/application.ts
import { Session } from '@shared/types/session'

export class SessionManager {
  private sessions = new Map<string, Session>()
  // 使用 Session 类型
}
```

### 方案二：通过 IPC 传递数据

如果类型定义过于复杂，可以通过 IPC 在主进程和渲染进程之间传递数据。

#### 1. 定义 IPC 接口

```typescript
// frontend/src/shared/types/ipc.ts
export interface IPCMessage {
  type: 'session:update' | 'message:new' | 'user:status'
  data: any
  timestamp: number
}

export interface SessionUpdatePayload {
  sessionId: string
  updates: Partial<Session>
}
```

#### 2. 主进程发送数据

```typescript
// frontend/src/main/websocket/handler.ts
import { BrowserWindow } from 'electron'

class WebsocketHandler {
  public async handleTextMessage(msg: any, ws: WebSocket): Promise<void> {
    // 处理消息
    const sessionData = await this.getSessionData(msg.sessionId)

    // 发送到渲染进程
    const mainWindow = BrowserWindow.getAllWindows()[0]
    mainWindow?.webContents.send('session:update', sessionData)
  }
}
```

#### 3. 渲染进程接收数据

```typescript
// frontend/src/renderer/src/status/session/store.ts
import { ipcRenderer } from 'electron'
import { Session } from '@shared/types/session'

class SessionStore {
  constructor() {
    ipcRenderer.on('session:update', (event, sessionData: Session) => {
      this.updateSession(sessionData)
    })
  }
}
```

### 方案三：使用 Preload 脚本

通过 Preload 脚本作为桥梁，在主进程和渲染进程之间传递类型化的数据。

#### 1. 定义 Preload API

```typescript
// frontend/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'
import { Session } from '@shared/types/session'

contextBridge.exposeInMainWorld('electronAPI', {
  session: {
    onUpdate: (callback: (session: Session) => void) => {
      ipcRenderer.on('session:update', (event, session) => callback(session))
    },
    update: (sessionId: string, updates: Partial<Session>) => {
      ipcRenderer.invoke('session:update', sessionId, updates)
    }
  }
})
```

#### 2. 渲染进程使用

```typescript
// frontend/src/renderer/src/status/session/store.ts
declare global {
  interface Window {
    electronAPI: {
      session: {
        onUpdate: (callback: (session: Session) => void) => void
        update: (sessionId: string, updates: Partial<Session>) => Promise<void>
      }
    }
  }
}

class SessionStore {
  constructor() {
    window.electronAPI.session.onUpdate((session: Session) => {
      this.updateSession(session)
    })
  }
}
```

## 最佳实践

### 1. 类型定义组织

```
src/shared/types/
├── index.ts           # 统一导出
├── session.ts         # 会话相关
├── message.ts         # 消息相关
├── user.ts           # 用户相关
├── api.ts            # API 响应类型
└── common.ts         # 通用类型
```

### 2. 统一导出

```typescript
// frontend/src/shared/types/index.ts
export * from './session'
export * from './message'
export * from './user'
export * from './api'
export * from './common'
```

### 3. 类型验证

```typescript
// frontend/src/shared/utils/validation.ts
import { Session } from '../types/session'

export function isValidSession(data: any): data is Session {
  return (
    typeof data === 'object' &&
    typeof data.sessionId === 'string' &&
    typeof data.contactId === 'string' &&
    typeof data.contactType === 'number'
  )
}
```

### 4. 错误处理

```typescript
// frontend/src/shared/utils/error-handling.ts
export class CrossProcessError extends Error {
  constructor(message: string, public readonly process: 'main' | 'renderer') {
    super(message)
    this.name = 'CrossProcessError'
  }
}

export function handleCrossProcessError(error: unknown, process: 'main' | 'renderer') {
  if (error instanceof CrossProcessError) {
    console.error(`[${process}] Cross-process error:`, error.message)
  } else {
    console.error(`[${process}] Unexpected error:`, error)
  }
}
```

## 总结

1. **推荐使用方案一**：共享类型定义，简单直接，类型安全
2. **复杂场景使用方案二**：通过 IPC 传递数据，适合复杂的数据交互
3. **安全要求高使用方案三**：通过 Preload 脚本，符合 Electron 安全最佳实践

选择哪种方案取决于你的具体需求：
- 简单的类型共享 → 方案一
- 复杂的数据交互 → 方案二
- 高安全要求 → 方案三
