// 会话管理器类
export class SessionManager {
  private sessions = new Map<number, Session>()
  private sortedSessions: SortedMap<SortKey, Session>
  private sessionIdToSortKey = new Map<number, SortKey>()
  private lastUpdateTime = 0
  private cacheExpireTime = 5 * 60 * 1000

  constructor() {
    // 初始化 SortedMap，定义排序规则
    this.sortedSessions = new SortedMap<SortKey, Session>((a, b) => {
      // 第一关键字：置顶状态
      if (a.isPinned !== b.isPinned) {
        return b.isPinned ? 1 : -1
      }
      // 第二关键字：最后消息时间
      if (a.lastMsgTime !== b.lastMsgTime) {
        return b.lastMsgTime - a.lastMsgTime
      }
      // 第三关键字：sessionId（稳定排序）
      return a.sessionId - b.sessionId
    })
  }

  private createSortKey(session: Session): SortKey {
    return {
      isPinned: session.isPinned,
      lastMsgTime: new Date(session.lastMsgTime).getTime(),
      sessionId: session.sessionId
    }
  }

  addSession(session: Session): void {
    this.sessions.set(session.sessionId, session)
    const sortKey = this.createSortKey(session)
    this.sessionIdToSortKey.set(session.sessionId, sortKey)
    this.sortedSessions.set(sortKey, session)
    this.lastUpdateTime = Date.now()
  }

  addSessions(sessions: Session[]): void {
    sessions.forEach(session => {
      this.addSession(session)
    })
  }

  getSession(sessionId: number): Session | undefined {
    return this.sessions.get(sessionId)
  }

  // 更新会话 - O(log n)
  updateSession(sessionId: number, updates: Partial<Session>): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const oldSortKey = this.sessionIdToSortKey.get(sessionId)
    if (!oldSortKey) return

    // 更新会话数据
    Object.assign(session, updates)

    // 创建新的排序键
    const newSortKey = this.createSortKey(session)

    // 如果排序键发生变化，需要重新插入
    if (this.compareSortKeys(oldSortKey, newSortKey) !== 0) {
      this.sortedSessions.delete(oldSortKey)
      this.sortedSessions.set(newSortKey, session)
      this.sessionIdToSortKey.set(sessionId, newSortKey)
    }

    this.lastUpdateTime = Date.now()
  }

  // 比较排序键
  private compareSortKeys(a: SortKey, b: SortKey): number {
    if (a.isPinned !== b.isPinned) {
      return b.isPinned ? 1 : -1
    }
    if (a.lastMsgTime !== b.lastMsgTime) {
      return b.lastMsgTime - a.lastMsgTime
    }
    return a.sessionId - b.sessionId
  }

  // 删除会话 - O(n)
  removeSession(sessionId: number): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const sortKey = this.sessionIdToSortKey.get(sessionId)
    if (sortKey) {
      this.sortedSessions.delete(sortKey)
      this.sessionIdToSortKey.delete(sessionId)
    }

    this.sessions.delete(sessionId)
    this.lastUpdateTime = Date.now()
  }

  // 清空所有会话
  clear(): void {
    this.sessions.clear()
    this.sortedSessions.clear()
    this.sessionIdToSortKey.clear()
    this.lastUpdateTime = 0
  }

  // 获取排序后的会话列表 - O(1)
  getOrderedSessions(): Session[] {
    return this.sortedSessions.values()
  }

  // 获取置顶会话 - O(n)
  getPinnedSessions(): Session[] {
    return this.getOrderedSessions().filter(s => s.isPinned)
  }

  // 获取未置顶会话 - O(n)
  getUnpinnedSessions(): Session[] {
    return this.getOrderedSessions().filter(s => !s.isPinned)
  }

  // 检查缓存是否过期
  isCacheExpired(): boolean {
    return Date.now() - this.lastUpdateTime > this.cacheExpireTime
  }

  // 获取会话数量
  getSessionCount(): number {
    return this.sessions.size
  }

  // 搜索会话
  searchSessions(keyword: string): Session[] {
    const lowerKeyword = keyword.toLowerCase()
    return this.getOrderedSessions().filter(session =>
      session.contactName.toLowerCase().includes(lowerKeyword) ||
      session.lastMsgContent.toLowerCase().includes(lowerKeyword)
    )
  }

  // 获取未读消息总数
  getTotalUnreadCount(): number {
    return Array.from(this.sessions.values()).reduce((total, session) => {
      return total + session.unreadCount
    }, 0)
  }

  // 标记会话为已读
  markSessionAsRead(sessionId: number): void {
    const session = this.sessions.get(sessionId)
    if (session && session.unreadCount > 0) {
      this.updateSession(sessionId, { unreadCount: 0 })
    }
  }

  // 切换置顶状态 - O(log n)
  togglePin(sessionId: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.updateSession(sessionId, { isPinned: !session.isPinned })
    }
  }

  // 切换静音状态 - O(log n)
  toggleMute(sessionId: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.updateSession(sessionId, { isMuted: !session.isMuted })
    }
  }
}

// 会话接口定义
export interface Session {
  sessionId: number
  contactId: number
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

// 排序键接口
export interface SortKey {
  isPinned: boolean
  lastMsgTime: number // 时间戳
  sessionId: number // 用于稳定排序
}

// SortedMap 实现
class SortedMap<K, V> {
  private map = new Map<K, V>()
  private sortedKeys: K[] = []
  private compareFn: (a: K, b: K) => number

  constructor(compareFn: (a: K, b: K) => number) {
    this.compareFn = compareFn
  }

  // 设置值 - O(log n)
  set(key: K, value: V): void {
    const exists = this.map.has(key)
    this.map.set(key, value)

    if (exists) {
      // 如果键已存在，需要重新排序
      this.removeFromSorted(key)
    }
    this.insertSorted(key)
  }

  // 获取值 - O(1)
  get(key: K): V | undefined {
    return this.map.get(key)
  }

  // 删除值 - O(n)
  delete(key: K): boolean {
    const deleted = this.map.delete(key)
    if (deleted) {
      this.removeFromSorted(key)
    }
    return deleted
  }

  // 获取所有值（按排序顺序）
  values(): V[] {
    return this.sortedKeys.map(key => this.map.get(key)!)
  }

  // 获取所有键（按排序顺序）
  keys(): K[] {
    return [...this.sortedKeys]
  }

  // 获取大小
  size(): number {
    return this.map.size
  }

  // 清空
  clear(): void {
    this.map.clear()
    this.sortedKeys = []
  }

  // 检查是否包含键
  has(key: K): boolean {
    return this.map.has(key)
  }

  // 插入到排序位置 - O(n) 但实际很快
  private insertSorted(key: K): void {
    const insertIndex = this.findInsertIndex(key)
    this.sortedKeys.splice(insertIndex, 0, key)
  }

  // 从排序数组中移除 - O(n)
  private removeFromSorted(key: K): void {
    const index = this.sortedKeys.indexOf(key)
    if (index !== -1) {
      this.sortedKeys.splice(index, 1)
    }
  }

  // 二分查找插入位置 - O(log n)
  private findInsertIndex(key: K): number {
    let left = 0
    let right = this.sortedKeys.length

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      const midKey = this.sortedKeys[mid]

      if (this.compareFn(key, midKey) < 0) {
        right = mid
      } else {
        left = mid + 1
      }
    }

    return left
  }
}

