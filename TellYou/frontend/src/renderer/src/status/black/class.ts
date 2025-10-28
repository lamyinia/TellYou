export interface BlackItem {
  userId: string;
  nickname: string;
  avatar?: string;
  blockedAt?: string;
}

export interface PageInfo {
  pageNo: number;
  pageSize: number;
  total: number;
}
