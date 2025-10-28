/**
 * 共享的 Session 类型定义
 * 供主进程和渲染进程共同使用
 */

export interface Session {
  sessionId: string;
  contactId: string;
  contactType: number;
  contactName: string;
  contactAvatar: string;
  contactSignature: string;
  lastMsgContent: string;
  lastMsgTime: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  memberCount?: number;
  maxMembers?: number;
  joinMode?: number;
  msgMode?: number;
  groupCard?: string;
  groupNotification?: string;
  myRole?: number;
  joinTime?: string;
  lastActive?: string;
  status: number;
}
/**
 * 消息相关类型定义
 */
export interface Message {
  id: number;
  sessionId: string;
  content: string;
  messageType: "text" | "image" | "video" | "voice" | "file";
  senderId: string;
  senderName: string;
  timestamp: Date;
  isRead: boolean;
  avatarVersion: string;
  nicknameVersion: string;
}

/**
 * WebSocket 消息类型
 */
export interface WebSocketMessage {
  messageId: string;
  sessionId: string;
  content: string;
  senderId: string;
  fromName: string;
  adjustedTimestamp: number;
  extra: {
    avatarVersion: string;
    nicknameVersion: string;
  };
}
