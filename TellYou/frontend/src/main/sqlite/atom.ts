/* eslint-disable */

import fs from "fs"
import sqlite3 from "sqlite3"
import { add_indexes, add_tables } from "./table"
import urlUtil from "@main/util/url-util"
import { join } from "path"

/**
 * sqlite 数据库管理器，提供完整的数据库操作封装
 * @author lanye
 * @date 2025/10/12 16:19
 */

type ColumnMap = {
  [bizField: string]: string
}
type GlobalColumnMap = {
  [tableName: string]: ColumnMap
}

export interface SqliteResult {
  success: boolean
  changes: number
  lastInsertRowID?: number
  error?: string
}

export interface QueryOptions {
  select?: string[]
  where?: Record<string, unknown>
  orderBy?: string | string[]
  limit?: number
  offset?: number
  groupBy?: string[]
  having?: Record<string, unknown>
}

export const nullResult: SqliteResult = {
  success: false,
  changes: 0,
  error: "数据库操作失败"
}

class SqliteManager {
  private dataBase: sqlite3.Database | null = null
  private globalColumnMap: GlobalColumnMap = {}

  /**
   * 重定向数据库连接
   */
  public redirectDataBase(): boolean {
    const path = join(urlUtil.sqlPath, "local.db")
    const result: boolean = fs.existsSync(path)
    this.dataBase = urlUtil.nodeEnv === "development" ? new (sqlite3.verbose().Database)(path) : new sqlite3.Database(path) // 开发模式输出日志
    return result
  }

  /**
   * 转换为驼峰命名
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase())
  }

  /**
   * 数据库字段转业务字段
   */
  private convertDb2Biz(data: Record<string, unknown> | null): Record<string, unknown> | null {
    if (!data) return null
    const bizData: Record<string, unknown> = {}
    for (const item in data) {
      bizData[this.toCamelCase(item)] = data[item]
    }
    return bizData
  }

  /**
   * 初始化数据库表
   */
  public async initTable(): Promise<void> {
    if (!this.dataBase) {
      throw new Error("数据库未初始化")
    }
    this.dataBase.serialize(async () => {
      await this.createTable()
    })
    await this.initTableColumnsMap()
  }

  /**
   * 创建数据库表
   */
  private async createTable(): Promise<void> {
    if (!this.dataBase) return

    const add_table = async (): Promise<void> => {
      for (const item of add_tables) {
        this.dataBase!.run(item)
      }
    }
    const add_index = async (): Promise<void> => {
      for (const item of add_indexes) {
        this.dataBase!.run(item)
      }
    }
    await add_table()
    await add_index()
  }

  /**
   * 初始化表字段映射
   */
  private async initTableColumnsMap(): Promise<void> {
    let sql: string = "select name from sqlite_master where type = 'table' and name != 'sqlite_sequence'"
    const tables = await this.queryAll(sql, [])
    for (let i = 0; i < tables.length; ++i) {
      sql = `PRAGMA table_info(${(tables[i] as { name: string }).name})`
      const columns = await this.queryAll(sql, [])
      const columnsMapItem: ColumnMap = {}
      for (let j = 0; j < columns.length; j++) {
        columnsMapItem[this.toCamelCase((columns[j] as { name: string }).name)] = (columns[j] as { name: string }).name
      }
      this.globalColumnMap[(tables[i] as { name: string }).name] = columnsMapItem
    }
  }

  /**
   * 查询多条记录
   */
  public queryAll(sql: string, params: unknown[]): Promise<Record<string, unknown>[]> {
    return new Promise((resolve) => {
      if (!this.dataBase) {
        console.error("数据库未初始化")
        resolve([])
        return
      }
      const stmt = this.dataBase.prepare(sql)
      stmt.all(params, (err: Error | null, rows: unknown[]) => {
        if (err) {
          console.error("SQL查询失败", {
            sql,
            params,
            error: err.message,
            stack: err.stack
          })
          resolve([])
          return
        }
        const result = (rows as Record<string, unknown>[]).map((item) =>
          this.convertDb2Biz(item)
        )
        console.info(sql, params, result)
        resolve(result as Record<string, unknown>[])
      })
      stmt.finalize()
    })
  }

  /**
   * 查询单条记录
   */
  public queryOne(sql: string, params: unknown[]): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      if (!this.dataBase) {
        console.error("数据库未初始化")
        resolve(null)
        return
      }
      const stmt = this.dataBase.prepare(sql)
      stmt.get(params, (err: Error | null, row: unknown) => {
        if (err) {
          console.error("SQL查询失败", {
            sql,
            params,
            error: err.message,
            stack: err.stack
          })
          resolve(null)
          return
        }
        resolve(this.convertDb2Biz(row as Record<string, unknown>))
      })
      stmt.finalize()
    })
  }

  /**
   * 通用查询方法
   */
  public query<T = Record<string, unknown>>(tableName: string, options?: QueryOptions): Promise<T[]> {
    const columnMap = this.globalColumnMap[tableName]
    if (!columnMap) {
      console.warn(`表 ${tableName} 的字段映射未找到`)
      return Promise.resolve([])
    }

    // 1. 构建 SELECT 子句
    let selectClause = '*'
    if (options?.select && options.select.length > 0) {
      const dbFields = options.select.map(bizField => {
        const dbField = columnMap[bizField]
        if (!dbField) {
          console.warn(`字段 ${bizField} 在表 ${tableName} 中未找到映射`)
          return bizField // 找不到映射就用原字段
        }
        return dbField
      })
      selectClause = dbFields.join(', ')
    }

    // 2. 构建 WHERE 子句
    const whereConditions: string[] = []
    const params: unknown[] = []
    if (options?.where) {
      for (const [bizField, value] of Object.entries(options.where)) {
        if (value !== undefined) {
          const dbField = columnMap[bizField] || bizField
          whereConditions.push(`${dbField} = ?`)
          params.push(value)
        }
      }
    }

    // 3. 构建 ORDER BY 子句
    let orderByClause = ''
    if (options?.orderBy) {
      const orderFields = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy]
      const dbOrderFields = orderFields.map(field => {
        // 支持 "field ASC" 或 "field DESC" 格式
        const parts = field.trim().split(/\s+/)
        const bizField = parts[0]
        const direction = parts[1] || ''
        const dbField = columnMap[bizField] || bizField
        return direction ? `${dbField} ${direction}` : dbField
      })
      orderByClause = ` ORDER BY ${dbOrderFields.join(', ')}`
    }

    // 4. 构建 GROUP BY 子句
    let groupByClause = ''
    if (options?.groupBy && options.groupBy.length > 0) {
      const dbGroupFields = options.groupBy.map(bizField => columnMap[bizField] || bizField)
      groupByClause = ` GROUP BY ${dbGroupFields.join(', ')}`
    }

    // 5. 构建 HAVING 子句
    let havingClause = ''
    if (options?.having) {
      const havingConditions: string[] = []
      for (const [bizField, value] of Object.entries(options.having)) {
        if (value !== undefined) {
          const dbField = columnMap[bizField] || bizField
          havingConditions.push(`${dbField} = ?`)
          params.push(value)
        }
      }
      if (havingConditions.length > 0) {
        havingClause = ` HAVING ${havingConditions.join(' AND ')}`
      }
    }

    // 6. 构建 LIMIT 和 OFFSET 子句
    let limitClause = ''
    if (options?.limit !== undefined) {
      limitClause = ` LIMIT ${options.limit}`
      if (options?.offset !== undefined) {
        limitClause += ` OFFSET ${options.offset}`
      }
    }

    // 7. 构建完整 SQL
    const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : ''
    const sql = `SELECT ${selectClause} FROM ${tableName}${whereClause}${groupByClause}${havingClause}${orderByClause}${limitClause}`

    // 8. 执行查询
    return this.queryAll(sql, params) as Promise<T[]>
  }

  /**
   * 通用单条查询方法
   */
  public queryOneByCondition<T = Record<string, unknown>>(tableName: string, options?: QueryOptions): Promise<T | null> {
    const queryOptions = { ...options, limit: 1 }
    return this.query<T>(tableName, queryOptions).then(results => results[0] || null)
  }

  /**
   * 通用计数查询方法
   */
  public queryCountByCondition(tableName: string, options?: Omit<QueryOptions, 'select' | 'orderBy' | 'limit' | 'offset'>): Promise<number> {
    const countOptions: QueryOptions = {
      ...options,
      select: ['COUNT(*) as count']
    }
    return this.query<{ count: number }>(tableName, countOptions).then(results => results[0]?.count || 0)
  }

  /**
   * 执行SQL语句（增强版，返回完整结果）
   */
  public sqliteRun(sql: string, params: unknown[]): Promise<SqliteResult> {
    return new Promise((resolve) => {
      if (!this.dataBase) {
        resolve({ success: false, changes: 0, error: "数据库未初始化" })
        return
      }
      const stmt = this.dataBase.prepare(sql)
      stmt.run(params, function (err: Error | null) {
        if (err) {
          console.error("SQL执行失败", {
            sql,
            params,
            error: err.message,
            stack: err.stack
          })
          resolve({ success: false, changes: 0, error: err.message })
          return
        }
        console.info(sql, params, this.changes)
        resolve({
          success: true,
          changes: this.changes,
          lastInsertRowID: this.lastID
        })
      })
      stmt.finalize()
    })
  }
  /**
   * 插入数据（通用方法）
   */
  public insert(sqlPrefix: string, tableName: string, data: Record<string, unknown>): Promise<SqliteResult> {
    const columnMap = this.globalColumnMap[tableName]
    const columns: string[] = []
    const params: unknown[] = []
    for (const item in data) {
      if (data[item] != undefined && columnMap[item] != undefined) {
        columns.push(columnMap[item])
        params.push(data[item])
      }
    }
    const prepare = Array(columns.length).fill("?").join(",")
    const sql = `${sqlPrefix} ${tableName}(${columns.join(",")}) values(${prepare})`
    return this.sqliteRun(sql, params)
  }

  /**
   * 插入或替换数据
   */
  public insertOrReplace(tableName: string, data: Record<string, unknown>): Promise<SqliteResult> {
    console.log(data)
    return this.insert("insert or replace into", tableName, data)
  }

  /**
   * 插入或忽略数据
   */
  public insertOrIgnore(tableName: string, data: Record<string, unknown>): Promise<SqliteResult> {
    return this.insert("insert or ignore into", tableName, data)
  }

  /**
   * 批量插入数据
   */
  public batchInsert(tableName: string, dataList: Record<string, unknown>[]): Promise<SqliteResult> {
    const columnMap = this.globalColumnMap[tableName]
    const firstData = dataList[0]
    const columns: string[] = []
    for (const item in firstData) {
      if (firstData[item] != undefined && columnMap[item] != undefined) {
        columns.push(columnMap[item])
      }
    }
    const placeholders = Array(columns.length).fill("?").join(",")
    const valuesPlaceholders = dataList.map(() => `(${placeholders})`).join(",")
    const sql = `INSERT OR IGNORE INTO ${tableName}(${columns.join(",")}) VALUES ${valuesPlaceholders}`
    const params: unknown[] = []
    for (const data of dataList) {
      for (const column of columns) {
        const bizField = Object.keys(columnMap).find((key) => columnMap[key] === column)
        params.push(data[bizField!])
      }
    }
    console.log("sql语句", sql, params)

    return this.sqliteRun(sql, params)
  }

  /**
   * 批量插入并返回ID列表
   */
  public async batchInsertWithIds(tableName: string, dataList: Record<string, unknown>[]): Promise<number[]> {
    if (dataList.length === 0) return []
    await this.batchInsert(tableName, dataList)
    const columnMap = this.globalColumnMap[tableName]
    const whereConditions: string[] = []
    const params: unknown[] = []

    for (const data of dataList) {
      const conditions: string[] = []
      for (const item in data) {
        if (data[item] != undefined && columnMap[item] != undefined) {
          if (item === "messageId") {
            conditions.push(`${columnMap[item]} = ?`)
            params.push(data[item])
          }
        }
      }
      if (conditions.length > 0) {
        whereConditions.push(`(${conditions.join(" AND ")})`)
      }
    }

    if (whereConditions.length === 0) return []
    const sql = `SELECT id FROM ${tableName} WHERE ${whereConditions.join(" OR ")}`
    const results = await this.queryAll(sql, params)
    return results.map((r) => r.id as number)
  }

  /**
   * 更新数据
   */
  public update(tableName: string, data: Record<string, unknown>, paramData: Record<string, unknown>): Promise<SqliteResult> {
    const columnMap = this.globalColumnMap[tableName]
    const columns: string[] = []
    const params: unknown[] = []
    const whereColumns: string[] = []
    for (const item in data) {
      if (data[item] != undefined && columnMap[item] != undefined) {
        columns.push(`${columnMap[item]} = ?`)
        params.push(data[item])
      }
    }
    for (const item in paramData) {
      if (paramData[item] != undefined && columnMap[item] != undefined) {
        whereColumns.push(`${columnMap[item]} = ?`)
        params.push(paramData[item])
      }
    }
    const sql = `update ${tableName}
                 set ${columns.join(",")} ${whereColumns.length > 0 ? " where " : ""}${whereColumns.join(" and ")}`

    console.info(sql)

    return this.sqliteRun(sql, params)
  }

  /**
   * 通用删除方法
   */
  public delete(tableName: string, where: Record<string, unknown>): Promise<SqliteResult> {
    if (!where || Object.keys(where).length === 0) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: "删除操作必须提供 WHERE 条件，以防止误删全表数据"
      })
    }

    const columnMap = this.globalColumnMap[tableName]
    if (!columnMap) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: `表 ${tableName} 的字段映射未找到`
      })
    }

    const whereConditions: string[] = []
    const params: unknown[] = []

    for (const [bizField, value] of Object.entries(where)) {
      if (value !== undefined) {
        const dbField = columnMap[bizField] || bizField
        whereConditions.push(`${dbField} = ?`)
        params.push(value)
      }
    }

    if (whereConditions.length === 0) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: "没有有效的删除条件"
      })
    }

    const sql = `DELETE FROM ${tableName} WHERE ${whereConditions.join(' AND ')}`
    console.info("删除SQL:", sql, params)

    return this.sqliteRun(sql, params)
  }

  /**
   * 根据ID删除单条记录
   */
  public deleteById(tableName: string, id: number | string): Promise<SqliteResult> {
    return this.delete(tableName, { id })
  }

  /**
   * 批量删除记录
   */
  public deleteBatch(tableName: string, ids: (number | string)[], idField: string = 'id'): Promise<SqliteResult> {
    if (!ids || ids.length === 0) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: "批量删除必须提供ID列表"
      })
    }

    const columnMap = this.globalColumnMap[tableName]
    if (!columnMap) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: `表 ${tableName} 的字段映射未找到`
      })
    }

    const dbField = columnMap[idField] || idField
    const placeholders = ids.map(() => '?').join(',')
    const sql = `DELETE FROM ${tableName} WHERE ${dbField} IN (${placeholders})`

    console.info("批量删除SQL:", sql, ids)

    return this.sqliteRun(sql, ids)
  }

  /**
   * 软删除方法（更新删除标记而不是物理删除）
   */
  public softDelete(tableName: string, where: Record<string, unknown>, deleteField: string = 'isDeleted', deleteValue: unknown = 1): Promise<SqliteResult> {
    const updateData = { [deleteField]: deleteValue }
    return this.update(tableName, updateData, where)
  }

  /**
   * 批量软删除
   */
  public softDeleteBatch(tableName: string, ids: (number | string)[], idField: string = 'id', deleteField: string = 'isDeleted', deleteValue: unknown = 1): Promise<SqliteResult> {
    if (!ids || ids.length === 0) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: "批量软删除必须提供ID列表"
      })
    }

    const columnMap = this.globalColumnMap[tableName]
    if (!columnMap) {
      return Promise.resolve({
        success: false,
        changes: 0,
        error: `表 ${tableName} 的字段映射未找到`
      })
    }

    const dbIdField = columnMap[idField] || idField
    const dbDeleteField = columnMap[deleteField] || deleteField
    const placeholders = ids.map(() => '?').join(',')
    const sql = `UPDATE ${tableName} SET ${dbDeleteField} = ? WHERE ${dbIdField} IN (${placeholders})`
    const params = [deleteValue, ...ids]

    console.info("批量软删除SQL:", sql, params)

    return this.sqliteRun(sql, params)
  }
}

const sqliteManager = new SqliteManager()
export default sqliteManager
