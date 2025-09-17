import { queryAll, sqliteRun } from '@main/sqlite/atom'

export interface BlackRow {
  id: number
  target_id: string
  target_type: number
  create_time?: string
}

export interface PagedResult<T> {
  list: T[]
  total: number
}

export const loadBlacklist = async (pageNo: number, pageSize: number): Promise<PagedResult<BlackRow>> => {
  const offset = (pageNo - 1) * pageSize
  const rows = (await queryAll(
    `SELECT * FROM blacklist ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [pageSize, offset]
  )) as BlackRow[]
  const totalRow = (await queryAll(`SELECT COUNT(1) AS total FROM blacklist`, [])) as Array<{ total: number }>
  return { list: rows, total: totalRow[0]?.total || 0 }
}

export const removeFromBlacklist = async (userIds: string[]): Promise<number> => {
  if (!userIds.length) return 0
  const placeholders = userIds.map(() => '?').join(',')
  const sql = `DELETE FROM blacklist WHERE target_id IN (${placeholders})`
  return sqliteRun(sql, userIds)
}


