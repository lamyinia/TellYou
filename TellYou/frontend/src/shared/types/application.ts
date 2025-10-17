export interface ApplicationItem {
  applyId: string
  applyUserId: string
  nickname: string
  avatar?: string
  applyInfo?: string
  status: 'pending' | 'approved' | 'rejected' | 'canceled'
  direction: 'incoming' | 'outgoing'
  applyTime?: string
}

export interface PageInfo {
  pageNo: number
  pageSize: number
  total: number
}
