/* eslint-disable */

import sqliteManager, { SqliteResult } from "@main/sqlite/atom";
import { store } from "@main/index";
import { uidKey } from "@main/electron-store/key";

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
  public async loadIncomingApplications(
    pageNo: number,
    pageSize: number,
    currentUserId?: string
  ): Promise<PagedResult<ApplicationRow>> {
    const offset = (pageNo - 1) * pageSize
    const where = currentUserId ? "WHERE target_id = ?" : ""
    const params = currentUserId
      ? [currentUserId, pageSize, offset]
      : [pageSize, offset];
    const rows = (await sqliteManager.queryAll(
      `SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`, params)) as unknown[] as ApplicationRow[];
    const totalRow = (await sqliteManager.queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : []
    )) as Array<{ total: number }>
    return { list: rows, total: totalRow[0]?.total || 0 }
  }

  public async loadOutgoingApplications(
    pageNo: number,
    pageSize: number,
    currentUserId?: string,
  ): Promise<PagedResult<ApplicationRow>> {
    const offset = (pageNo - 1) * pageSize;
    const where = currentUserId ? "WHERE apply_user_id = ?" : "";
    const params = currentUserId
      ? [currentUserId, pageSize, offset]
      : [pageSize, offset];
    const rows = (await sqliteManager.queryAll(
      `SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`,
      params,
    )) as unknown[] as ApplicationRow[];
    const totalRow = (await sqliteManager.queryAll(
      `SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : [],
    )) as Array<{ total: number }>;
    return { list: rows, total: totalRow[0]?.total || 0 };
  }

  public async insertApplication(params: any): Promise<SqliteResult> {
    return sqliteManager.insertOrIgnore("contact_applications", params);
  }

  public async insertMoreApplication(paramsList: any[]): Promise<SqliteResult> {
    return sqliteManager.batchInsert("contact_applications", paramsList);
  }

  public async getIncomingCursor(): Promise<string> {
    const sql =
      "select max(last_apply_time) as cursor from contact_applications where target_id = ?";
    const cursor = (await sqliteManager.queryAll(sql, [store.get(uidKey)])) as unknown[] as {
      cursor: string
    }[]
    return cursor[0]?.cursor || ""
  }

  public async deleteApplication(applyId: string): Promise<number> {
    const sql = "delete from contact_applications where apply_id = ?"
    return sqliteManager.sqliteRun(sql, [applyId]).then(result => result.changes)
  }
}
const applicationDao = new ApplicationDao()
export default applicationDao
