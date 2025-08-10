export interface ChatMessage {
  id: number
  sessionId: number
  content: string
  messageType: 'text' | 'image' | 'file' | 'system'
  senderId: number
  senderName: string
  senderAvatar: string
  timestamp: Date
  isRead: boolean
  isSelf: boolean
  // 其他字段...
}

// 消息分页信息
export interface MessagePageInfo {
  sessionId: number
  hasMore: boolean
  hasMoreNewer: boolean
  oldestMessageId: number | null
  newestMessageId: number | null
  totalCount: number
}

// 消息缓存配置
export interface MessageCacheConfig {
  maxMessagesPerSession: number  // 每个会话最大缓存消息数
  maxCachedSessions: number       // 最大缓存会话数
  pageSize: number              // 每次加载的消息数量
  preloadThreshold: number      // 预加载阈值（距离底部多少条时开始加载）
  cacheExpireTime: number       // 缓存过期时间（毫秒）
}
