import fs from 'fs'
import os from 'os'
import sqlite3 from 'sqlite3'
import { add_indexes, add_tables } from './table'

type ColumnMap = { [bizField: string]: string }
type GlobalColumnMap = { [tableName: string]: ColumnMap }
const globalColumnMap: GlobalColumnMap = {}

export const instanceId: string = process.env.ELECTRON_INSTANCE_ID as string || ''
const NODE_ENV: string = process.env.NODE_ENV || 'production'
const userDir: string = os.homedir()
const baseFolder: string = userDir + (NODE_ENV === 'development' ? '/.tellyoudev/' : 'tellyou/')
let dataFolder: string = baseFolder
let dataBase: sqlite3.Database

export const setCurrentFolder = (userId: string): void => {
  dataFolder = baseFolder + '_' + userId + '/'
  console.info('数据库操作目录 ' + dataFolder)
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder)
  }
}
export const existsLocalDB = (): boolean => {
  const result: boolean = fs.existsSync(dataFolder + 'local.db')
  dataBase = (NODE_ENV === 'development') ?
    new (sqlite3.verbose().Database)(dataFolder + 'local.db') : new sqlite3.Database(dataFolder + 'local.db')  // 开发模式输出日志
  return result
}
export const initTable =  async ()=> {
  dataBase.serialize(async () => {
    await createTable()
  })
  await initTableColumnsMap()
}

export const queryAll = (sql: string, params: unknown[]): Promise<Record<string, unknown>[]> => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql)
    stmt.all(params, function(err: Error | null, rows: unknown[]) {
      if (err) {
        console.error('SQL查询失败', { sql, params, error: err.message, stack: err.stack })
        resolve([])
        return
      }
      const result = (rows as Record<string, unknown>[]).map(item => convertDb2Biz(item))
      console.info(sql, params, result)
      resolve(result as Record<string, unknown>[])
    })
    stmt.finalize()
  })
}
export const queryCount = (sql: string, params: unknown[]): Promise<number> => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql)
    stmt.get(params, function(err: Error | null, row: unknown) {
      if (err) {
        console.error('SQL查询失败', { sql, params, error: err.message, stack: err.stack })
        resolve(0)
        return
      }
      resolve(row ? Number(Object.values(row)[0]) : 0)
    })
    stmt.finalize()
  })
}
export const queryOne = (sql: string, params: unknown[]): Promise<Record<string, unknown> | null> => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql)
    stmt.get(params, function(err: Error | null, row: unknown) {
      if (err) {
        console.error('SQL查询失败', { sql, params, error: err.message, stack: err.stack })
        resolve(null)
        return
      }
      resolve(convertDb2Biz(row as Record<string, unknown>))
    })
    stmt.finalize()
  })
}

export const sqliteRun = (sql: string, params: unknown[]): Promise<number> => {
  return new Promise((resolve, reject) => {
    const stmt = dataBase.prepare(sql)
    stmt.run(params, function(err: Error | null) {
      if (err) {
        console.error('SQL查询失败', { sql, params, error: err.message, stack: err.stack })
        reject(-1)
        return
      }
      console.info(sql, params, this.changes)
      resolve(this.changes)
    })
    stmt.finalize()
  })
}
export const insert = (sqlPrefix: string, tableName: string, data: Record<string, unknown>): Promise<number> => {
  const columnMap = globalColumnMap[tableName]
  const columns: string[] = []
  const params: unknown[] = []
  for (const item in data) {
    if (data[item] != undefined && columnMap[item] != undefined) {
      columns.push(columnMap[item])
      params.push(data[item])
    }
  }
  const prepare = Array(columns.length).fill('?').join(',')
  const sql = `${sqlPrefix} ${tableName}(${columns.join(',')}) values(${prepare})`
  return sqliteRun(sql, params)
}
export const insertOrReplace = (tableName: string, data: Record<string, unknown>): Promise<number> => {
  console.log(data)
  return insert('insert or replace into', tableName, data)
}
export const insertOrIgnore = (tableName: string, data: Record<string, unknown>): Promise<number> => {
  return insert('insert or ignore into', tableName, data)
}
export const batchInsert = (tableName: string, dataList: Record<string,unknown>[]): Promise<number> => {
  const columnMap = globalColumnMap[tableName]
  const firstData = dataList[0]
  const columns: string[] = []
  for (const item in firstData){
    if (firstData[item] != undefined && columnMap[item] != undefined){
      columns.push(columnMap[item])
    }
  }
  const placeholders = Array(columns.length).fill('?').join(',')
  const valuesPlaceholders = dataList.map(() => `(${placeholders})`).join(',')
  const sql = `INSERT OR IGNORE INTO ${tableName}(${columns.join(',')}) VALUES ${valuesPlaceholders}`
  const params: unknown[] = []
  for (const data of dataList) {
    for (const column of columns) {
      const bizField = Object.keys(columnMap).find(key => columnMap[key] === column)
      params.push(data[bizField!])
    }
  }
  console.log('sql语句', sql, params)

  return sqliteRun(sql, params)
}
export const batchInsertWithIds = async (tableName: string, dataList: Record<string,unknown>[]):Promise<number[]> => {
  if (dataList.length === 0) return []
  await batchInsert(tableName, dataList)
  const columnMap = globalColumnMap[tableName]
  const whereConditions: string[] = []
  const params: unknown[] = []

  for (const data of dataList) {
    const conditions: string[] = []
    for (const item in data) {
      if (data[item] != undefined && columnMap[item] != undefined) {
        if (item === 'messageId') {
          conditions.push(`${columnMap[item]} = ?`)
          params.push(data[item])
        }
      }
    }
    if (conditions.length > 0) {
      whereConditions.push(`(${conditions.join(' AND ')})`)
    }
  }

  if (whereConditions.length === 0) return []
  const sql = `SELECT id FROM ${tableName} WHERE ${whereConditions.join(' OR ')}`
  const results = await queryAll(sql, params)
  return results.map(r => r.id as number)
}

export const update = (tableName: string, data: Record<string, unknown>, paramData: Record<string, unknown>): Promise<number> => {
  const columnMap = globalColumnMap[tableName]
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
               set ${columns.join(',')} ${whereColumns.length > 0 ? ' where ' : ''}${whereColumns.join(' and ')}`

  console.info(sql)

  return sqliteRun(sql, params)
}


const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase())
}
const convertDb2Biz = (data: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!data) return null
  const bizData: Record<string, unknown> = {}
  for (const item in data) {
    bizData[toCamelCase(item)] = data[item]
  }
  return bizData
}

const createTable = async (): Promise<void> => {
  const add_table = async () => {
    for (const item of add_tables) {
      dataBase.run(item)
    }
  }
  const add_index = async () => {
    for (const item of add_indexes) {
      dataBase.run(item)
    }
  }
  await add_table()
  await add_index()
}
const initTableColumnsMap = async (): Promise<void> => {
  let sql: string = 'select name from sqlite_master where type = \'table\' and name != \'sqlite_sequence\''
  const tables = await queryAll(sql, [])
  for (let i = 0; i < tables.length; ++i) {
    sql = `PRAGMA table_info(${(tables[i] as { name: string }).name})`
    const columns = await queryAll(sql, [])
    const columnsMapItem: ColumnMap = {}
    for (let j = 0; j < columns.length; j++) {
      columnsMapItem[toCamelCase((columns[j] as { name: string }).name)] = (columns[j] as { name: string }).name
    }
    globalColumnMap[(tables[i] as { name: string }).name] = columnsMapItem
  }
}


