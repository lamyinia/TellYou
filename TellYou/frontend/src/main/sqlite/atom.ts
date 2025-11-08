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

type ColumnMap = { [bizField: string]: string }
type GlobalColumnMap = { [tableName: string]: ColumnMap }

export interface SqliteResult {
  success: boolean
  changes: number
  lastInsertRowID?: number
  error?: string
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
}

const sqliteManager = new SqliteManager()
export default sqliteManager
