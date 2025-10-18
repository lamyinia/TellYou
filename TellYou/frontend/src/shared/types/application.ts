export interface ApplicationItem {
  applyId: string
  applyUserId: string
  targetId: string
  nickname: string
  applyInfo: string
  contactType: number
  status: number
  lastApplyTime?: string
}

export interface PageInfo {
  pageNo: number
  pageSize: number
  total: number
}
