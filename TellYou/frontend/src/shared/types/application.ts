export interface FriendApplicationItem {
  applyId: string
  userId: string
  nickname: string
  avatar?: string
  remark?: string
  status: 'pending' | 'approved' | 'rejected' | 'canceled'
  direction: 'incoming' | 'outgoing'
  applyTime?: string
}

export interface PageInfo {
  pageNo: number
  pageSize: number
  total: number
}
