export interface ChatMessage {
  id: number
  sessionId: string
  content: string
  messageType: 'text' | 'image' | 'file' | 'system'
  senderId: string
  senderName: string
  senderAvatar: string
  timestamp: Date
  isRead: boolean
}

export interface MessagePageInfo {
  sessionId: string
  hasMore: boolean
  hasMoreNewer: boolean
  oldestMessageId: number | null
  newestMessageId: number | null
  totalCount: number
}

export interface MessageCacheConfig {
  maxMessagesPerSession: number
  maxCachedSessions: number
  pageSize: number
  preloadThreshold: number
  cacheExpireTime: number
}

export interface MessagesResponse {
  messages: ChatMessage[]
  hasMore: boolean
  totalCount: number
}
