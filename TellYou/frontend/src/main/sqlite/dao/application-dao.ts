import { insertOrIgnore, queryAll, sqliteRun } from '@main/sqlite/atom'

export interface ApplicationRow {
  id: number
  apply_user_id: string
  target_id: string
  contact_type: number
  status: number
  apply_info?: string
  last_apply_time?: string
}

export interface PagedResult<T> {
  list: T[]
  total: number
}

class ApplicationDao {
  public async loadIncomingApplications(pageNo: number, pageSize: number, currentUserId?: string): Promise<PagedResult<ApplicationRow>> {
    const offset = (pageNo - 1) * pageSize
    const where = currentUserId ? 'WHERE target_id = ?' : ''
    const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset]
    const rows = (await queryAll(`SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`,params)) as unknown[] as ApplicationRow[]
    const totalRow = (await queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : [])) as Array<{ total: number }>
    return { list: rows, total: totalRow[0]?.total || 0 }
  }

  public async loadOutgoingApplications(pageNo: number, pageSize: number, currentUserId?: string): Promise<PagedResult<ApplicationRow>> {
    const offset = (pageNo - 1) * pageSize
    const where = currentUserId ? 'WHERE apply_user_id = ?' : ''
    const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset]
    const rows = (await queryAll(`SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`, params)) as unknown[] as ApplicationRow[]
    const totalRow = (await queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : [])) as Array<{ total: number }>
    return { list: rows, total: totalRow[0]?.total || 0 }
  }

  public async approveIncoming(ids: string[]): Promise<number> {
    if (!ids.length) return 0
    const placeholders = ids.map(() => '?').join(',')
    const sql = `UPDATE contact_applications SET status = 1 WHERE id IN (${placeholders})`
    return sqliteRun(sql, ids)
  }

  public async rejectIncoming(ids: string[]): Promise<number> {
    if (!ids.length) return 0
    const placeholders = ids.map(() => '?').join(',')
    const sql = `UPDATE contact_applications SET status = 2 WHERE id IN (${placeholders})`
    return sqliteRun(sql, ids)
  }
  public async insertApplication(params: any): Promise<number> {
    return insertOrIgnore('contact_applications', params)
  }

  public async deleteApplication(applyId: string): Promise<number> {
    const sql = 'delete from contact_applications where apply_id = ?'
    return sqliteRun(sql, [applyId])
  }
}
const applicationDao = new ApplicationDao()
export default applicationDao
