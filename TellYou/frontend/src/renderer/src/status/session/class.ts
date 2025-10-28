import { Session } from "@shared/types/session";

export class SessionManager {
  private sessions = new Map<string, Session>();
  private sortedSessions: SortedMap<SortKey, Session>;
  private sessionIdToSortKey = new Map<string, SortKey>();
  private lastUpdateTime = 0;

  constructor() {
    this.sortedSessions = new SortedMap<SortKey, Session>((a, b) => {
      //  左边更优先，返回 -1，否则返回 1
      if (a.isPinned !== b.isPinned) {
        return b.isPinned ? 1 : -1;
      }
      if (a.lastMsgTime !== b.lastMsgTime) {
        return b.lastMsgTime - a.lastMsgTime;
      }
      return a.sessionId.localeCompare(b.sessionId);
    });
  }

  private createSortKey(session: Session): SortKey {
    return {
      isPinned: session.isPinned,
      lastMsgTime: new Date(session.lastMsgTime).getTime(),
      sessionId: session.sessionId,
    };
  }

  addSession(session: Session): void {
    if (this.sessions.has(session.sessionId)) {
      this.updateSession(session.sessionId, session);
      return;
    }

    this.sessions.set(session.sessionId, session);
    const sortKey = this.createSortKey(session);
    this.sessionIdToSortKey.set(session.sessionId, sortKey);
    this.sortedSessions.set(sortKey, session);
    this.lastUpdateTime = Date.now();
  }

  addSessions(sessions: Session[]): void {
    sessions.forEach((session) => {
      this.addSession(session);
    });
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: Partial<Session>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const oldSortKey = this.sessionIdToSortKey.get(sessionId);
    if (!oldSortKey) return;

    Object.assign(session, updates);

    const newSortKey = this.createSortKey(session);

    if (this.compareSortKeys(oldSortKey, newSortKey) !== 0) {
      this.sortedSessions.delete(oldSortKey);
      this.sortedSessions.set(newSortKey, session);
      this.sessionIdToSortKey.set(sessionId, newSortKey);
    } else {
      this.sortedSessions.set(oldSortKey, session);
    }

    this.lastUpdateTime = Date.now();
  }

  private compareSortKeys(a: SortKey, b: SortKey): number {
    if (a.isPinned !== b.isPinned) {
      return b.isPinned ? 1 : -1;
    }
    if (a.lastMsgTime !== b.lastMsgTime) {
      return b.lastMsgTime - a.lastMsgTime;
    }
    return a.sessionId.localeCompare(b.sessionId);
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const sortKey = this.sessionIdToSortKey.get(sessionId);
    if (sortKey) {
      this.sortedSessions.delete(sortKey);
      this.sessionIdToSortKey.delete(sessionId);
    }
    this.sessions.delete(sessionId);
    this.lastUpdateTime = Date.now();
  }

  clear(): void {
    this.sessions.clear();
    this.sortedSessions.clear();
    this.sessionIdToSortKey.clear();
    this.lastUpdateTime = 0;
  }

  getOrderedSessions(): Session[] {
    return this.sortedSessions.values();
  }

  searchSessions(keyword: string): Session[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.getOrderedSessions().filter(
      (session) =>
        session.contactName.toLowerCase().includes(lowerKeyword) ||
        session.lastMsgContent.toLowerCase().includes(lowerKeyword),
    );
  }

  getTotalUnreadCount(): number {
    return Array.from(this.sessions.values()).reduce((total, session) => {
      return total + session.unreadCount;
    }, 0);
  }

  markSessionAsRead(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.unreadCount > 0) {
      this.updateSession(sessionId, { unreadCount: 0 });
    }
  }

  togglePin(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.updateSession(sessionId, { isPinned: !session.isPinned });
    }
  }

  toggleMute(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.updateSession(sessionId, { isMuted: !session.isMuted });
    }
  }
}

interface SortKey {
  isPinned: boolean;
  lastMsgTime: number;
  sessionId: string;
}
// 自定义 sortedMap，渲染友好，按照 isPinned 第一关键字、lastMsgTime 第二关键字排序，插入、删除时间复杂度从 O(nlog(n)) 优化至线性 O(n)
class SortedMap<K, V> {
  private map = new Map<K, V>();
  private sortedKeys: K[] = [];
  private readonly compareFn: (a: K, b: K) => number;

  constructor(compareFn: (a: K, b: K) => number) {
    this.compareFn = compareFn;
  }

  set(key: K, value: V): void {
    const exists = this.map.has(key);
    this.map.set(key, value);

    if (exists) {
      console.log("删除", key);
      this.removeFromSorted(key);
    }
    this.insertSorted(key);
  }

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  delete(key: K): boolean {
    const deleted = this.map.delete(key);
    if (deleted) {
      this.removeFromSorted(key);
    }
    return deleted;
  }

  values(): V[] {
    return this.sortedKeys.map((key) => this.map.get(key)!);
  }

  keys(): K[] {
    return [...this.sortedKeys];
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
    this.sortedKeys = [];
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  private insertSorted(key: K): void {
    const insertIndex = this.findInsertIndex(key);
    this.sortedKeys.splice(insertIndex, 0, key);
  }

  private removeFromSorted(key: K): void {
    const index = this.sortedKeys.indexOf(key);
    if (index !== -1) {
      this.sortedKeys.splice(index, 1);
    }
  }
  //  二分查找需要插入的下标
  private findInsertIndex(key: K): number {
    let left = 0;
    let right = this.sortedKeys.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midKey = this.sortedKeys[mid];

      if (this.compareFn(key, midKey) < 0) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    return left;
  }
}
