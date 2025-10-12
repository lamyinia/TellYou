# MessageAdapter 消息适配器

## 概述

`MessageAdapter` 是一个用于消息对象转换的适配器类，负责在不同数据格式之间进行转换，包括 WebSocket 消息、数据库记录和前端 Message 对象之间的转换。

## 功能特性

- 🔄 **WebSocket 消息转换**：将 WebSocket 接收的消息转换为标准 Message 对象
- 🗄️ **数据库记录转换**：在数据库记录和 Message 对象之间进行双向转换
- 🛡️ **类型安全**：使用 TypeScript 类型定义确保数据一致性
- 🧹 **数据清理**：自动处理空值和类型转换

## 主要方法

### adaptWebSocketMessage()

将 WebSocket 消息转换为 Message 对象。

```typescript
public adaptWebSocketMessage(msg: any, insertId: number): Message
```

**参数：**
- `msg`: WebSocket 接收的原始消息对象
- `insertId`: 数据库插入后返回的 ID

**返回：** 标准化的 Message 对象

**示例：**
```typescript
const message = messageAdapter.adaptWebSocketMessage(wsMessage, insertId)
```

### adaptDatabaseRecord()

将数据库记录转换为 Message 对象。

```typescript
public adaptDatabaseRecord(record: any): Message
```

**参数：**
- `record`: 数据库查询返回的记录对象

**返回：** 标准化的 Message 对象

**示例：**
```typescript
const message = messageAdapter.adaptDatabaseRecord(dbRecord)
```

### adaptToDatabaseRecord()

将 Message 对象转换为数据库记录格式。

```typescript
public adaptToDatabaseRecord(message: Message): any
```

**参数：**
- `message`: 标准化的 Message 对象

**返回：** 数据库记录格式的对象

**示例：**
```typescript
const dbRecord = messageAdapter.adaptToDatabaseRecord(message)
```

### adaptToDatabaseMessage()

将 WebSocket 消息转换为数据库消息格式。

```typescript
public adaptToDatabaseMessage(message: any): any
```

**参数：**
- `message`: WebSocket 接收的原始消息对象

**返回：** 数据库消息格式的对象

**示例：**
```typescript
const dbMessage = messageAdapter.adaptToDatabaseMessage(wsMessage)
```

### adaptMessageRowToMessage()

将数据库消息行转换为 Message 对象。

```typescript
public adaptMessageRowToMessage(row: any): Message
```

**参数：**
- `row`: 数据库查询返回的消息行对象

**返回：** 标准化的 Message 对象

**示例：**
```typescript
const message = messageAdapter.adaptMessageRowToMessage(dbRow)
```

## 使用场景

### 1. WebSocket 消息处理

```typescript
// 在 websocket handler 中使用
class WebsocketHandler {
  public async handleTextMessage(msg: any, ws: WebSocket): Promise<void> {
    const insertId = await messageService.handleSingleMessage(msg)
    const message = messageAdapter.adaptWebSocketMessage(msg, insertId)
    
    // 发送到渲染进程
    mainWindow?.webContents.send('message:new', message)
  }
}
```

### 2. 数据库操作

```typescript
// 保存消息到数据库（方式1：通过 Message 对象）
const message = messageAdapter.adaptWebSocketMessage(wsMessage, insertId)
const dbRecord = messageAdapter.adaptToDatabaseRecord(message)
await messageDao.insert(dbRecord)

// 保存消息到数据库（方式2：直接转换）
const dbMessage = messageAdapter.adaptToDatabaseMessage(wsMessage)
await messageDao.addLocalMessage(dbMessage)

// 从数据库读取消息
const dbRows = await messageDao.getMessageBySessionId(sessionId, options)
const messages = dbRows.messages.map(row => 
  messageAdapter.adaptMessageRowToMessage(row)
)
```

### 3. 数据验证和清理

适配器会自动处理以下数据清理工作：

- **空值处理**：`msg.content ?? ''` 确保内容不为 null
- **类型转换**：`String()`, `Number()`, `Boolean()` 确保类型正确
- **时间格式**：统一使用 `Date` 对象处理时间戳
- **布尔值转换**：数据库中的 0/1 转换为 true/false

## 数据映射

### WebSocket 消息 → Message 对象

| WebSocket 字段 | Message 字段 | 转换说明 |
|----------------|--------------|----------|
| `msg.sessionId` | `sessionId` | 直接映射 |
| `msg.content` | `content` | 字符串转换，空值处理 |
| `msg.senderId` | `senderId` | 直接映射 |
| `msg.fromName` | `senderName` | 空值处理 |
| `msg.adjustedTimestamp` | `timestamp` | 时间戳转 Date 对象 |
| `msg.extra['avatarVersion']` | `avatarVersion` | 字符串转换 |
| `msg.extra['nicknameVersion']` | `nicknameVersion` | 字符串转换 |
| `insertId` | `id` | 数字转换 |
| 固定值 | `messageType` | 设为 'text' |
| 固定值 | `isRead` | 设为 true |

### 数据库记录 ↔ Message 对象

| 数据库字段 | Message 字段 | 转换说明 |
|------------|--------------|----------|
| `session_id` | `sessionId` | 下划线转驼峰 |
| `message_type` | `messageType` | 下划线转驼峰 |
| `sender_id` | `senderId` | 下划线转驼峰 |
| `sender_name` | `senderName` | 下划线转驼峰 |
| `is_read` | `isRead` | 下划线转驼峰，0/1 转布尔值 |
| `avatar_version` | `avatarVersion` | 下划线转驼峰 |
| `nickname_version` | `nicknameVersion` | 下划线转驼峰 |

### WebSocket 消息 → 数据库消息格式

| WebSocket 字段 | 数据库字段 | 转换说明 |
|----------------|------------|----------|
| `msg.sessionId` | `sessionId` | 字符串转换 |
| `msg.sequenceNumber` | `sequenceId` | 直接映射 |
| `msg.senderId` | `senderId` | 字符串转换 |
| `msg.messageId` | `msgId` | 直接映射 |
| `msg.fromName` | `senderName` | 空值处理 |
| `msg.messageType` | `msgType` | 直接映射 |
| `msg.content` | `text` | 直接映射 |
| `msg.extra` | `extData` | JSON 字符串化 |
| `msg.adjustedTimestamp` | `sendTime` | 时间戳转 ISO 字符串 |
| 固定值 | `isRecalled` | 设为 0 |
| 固定值 | `isRead` | 设为 1 |

### 数据库消息行 → Message 对象

| 数据库字段 | Message 字段 | 转换说明 |
|------------|--------------|----------|
| `row.id` | `id` | 直接映射 |
| `row.sessionId` | `sessionId` | 直接映射 |
| `row.text` | `content` | 空值处理 |
| `row.msgType` | `messageType` | 数字转枚举类型 |
| `row.senderId` | `senderId` | 直接映射 |
| `row.senderName` | `senderName` | 空值处理 |
| `row.sendTime` | `timestamp` | 字符串转 Date 对象 |
| `row.isRead` | `isRead` | 数字转布尔值 |
| `row.extData` | `avatarVersion` | JSON 解析后提取 |
| `row.extData` | `nicknameVersion` | JSON 解析后提取 |

**消息类型映射：**
- `1` → `'text'`
- `2` → `'image'`
- `5` → `'file'`
- 其他 → `'text'` (默认)

## 最佳实践

### 1. 统一使用适配器

```typescript
// ✅ 推荐：使用适配器
const message = messageAdapter.adaptWebSocketMessage(msg, insertId)

// ❌ 不推荐：直接构造对象
const message = {
  id: Number(insertId) || 0,
  sessionId: msg.sessionId,
  // ... 更多字段
}
```

### 2. 错误处理

```typescript
try {
  const message = messageAdapter.adaptWebSocketMessage(msg, insertId)
  // 处理消息
} catch (error) {
  console.error('消息转换失败:', error)
  // 错误处理逻辑
}
```

### 3. 类型检查

```typescript
import { Message } from '@shared/types/session'

function processMessage(message: Message) {
  // 类型安全的处理逻辑
}
```

## 扩展性

如果需要支持新的消息类型或数据源，可以轻松扩展适配器：

```typescript
class MessageAdapter {
  // 现有方法...
  
  // 新增：支持其他消息源
  public adaptApiResponse(response: any): Message {
    return {
      id: response.id,
      sessionId: response.sessionId,
      // ... 其他字段映射
    }
  }
}
```

## 总结

`MessageAdapter` 提供了统一的消息对象转换接口，确保：

1. **数据一致性**：所有消息对象都遵循相同的格式
2. **类型安全**：使用 TypeScript 类型检查
3. **易于维护**：集中管理数据转换逻辑
4. **可扩展性**：支持新的数据源和格式
