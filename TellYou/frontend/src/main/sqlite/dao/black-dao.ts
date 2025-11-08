import sqliteManager from "@main/sqlite/atom";

export interface BlackRow {
  id: number;
  target_id: string;
  target_type: number;
  create_time?: string;
}
export interface PagedResult<T> {
  list: T[];
  total: number;
}

class BlackDao {
  public async loadBlacklist(
    pageNo: number,
    pageSize: number,
  ): Promise<PagedResult<BlackRow>> {
    const offset = (pageNo - 1) * pageSize;
    const rows = (await sqliteManager.queryAll(
      `SELECT * FROM blacklist ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [pageSize, offset],
    )) as unknown as BlackRow[];
    const totalRow = (await sqliteManager.queryAll(
      `SELECT COUNT(1) AS total FROM blacklist`,
      [],
    )) as Array<{
      total: number;
    }>;
    return { list: rows, total: totalRow[0]?.total || 0 };
  }

  public async removeFromBlacklist(userIds: string[]): Promise<number> {
    if (!userIds.length) return 0;
    const placeholders = userIds.map(() => "?").join(",");
    const sql = `DELETE FROM blacklist WHERE target_id IN (${placeholders})`;
    return sqliteManager.sqliteRun(sql, userIds).then(result => result.changes);
  }
}
const blackDao = new BlackDao();
export default blackDao;
