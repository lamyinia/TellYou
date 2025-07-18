// import fs from 'fs'
// import os from 'os'
// import sqlite3 from 'sqlite3'
// import { add_indexes, add_tables } from '../src/main/sqlite/TableOperation'
//
// type ColumnMap = {[bizField: string]: string}
// type GlobalColumnMap = {[tableName: string]: ColumnMap}
// const globalColumnMap: GlobalColumnMap = {}
//
// const NODE_ENV: string = process.env.NODE_ENV || "production"
// const userDir: string = os.homedir()
// const dataFolder: string = userDir + (NODE_ENV === 'development' ? '/.tellyoudev/' : 'tellyou/');
// var dataBase: sqlite3.Database
//
// const toCamelCase = (str: string): string => {
//   return str.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
// };
// const convertDb2Biz = (data: Record<string,unknown>|null): Record<string, unknown>|null => {
//   if (!data) return null
//   const bizData: Record<string, unknown> = {}
//   for (const item in data){
//     bizData[toCamelCase(item)] = data[item]
//   }
//   return bizData
// }
// const createTable = async (): Promise<void> => {
//   for (const item of add_tables) {
//     await dataBase.run(item);
//   }
//   for (const item of add_indexes) {
//     await dataBase.run(item);
//   }
//   /*for (const item of alter_tables) {
//     const fieldList = await queryAll(`pragma table_info(${item.tableName})`, []);
//     const field = fieldList.some((row: any) => row.name === item.field);
//     if (!field) {
//       await dataBase.run(item.sql);
//     }
//   }*/
// }
//
// export const initTableColumnsMap = async() => {
//   let sql: string = "select name from sqlite_master where type = 'table' and name != 'sqlite_sequence'";
//   let tables = await queryAll(sql, [])
//   for (let i = 0; i < tables.length; ++ i){
//     sql = `PRAGMA table_info(${(tables[i] as { name: string }).name})`;
//     let columns = await queryAll(sql, [])
//     const columnsMapItem: ColumnMap = {}
//     for (let j = 0; j < columns.length; j++) {
//       columnsMapItem[toCamelCase((columns[j] as { name: string }).name)] = (columns[j] as { name: string }).name;
//     }
//     globalColumnMap[(tables[i] as {name: string}).name] = columnsMapItem
//   }
//   console.log(globalColumnMap)
// }
// export const createDir = () => {
//   console.log(dataFolder)
//   if (!fs.existsSync(dataFolder)){
//     fs.mkdirSync(dataFolder)
//   }
//   dataBase = (NODE_ENV === 'development') ?
//     new (sqlite3.verbose().Database)(dataFolder+"local.db") : new sqlite3.Database(dataFolder + "local.db")
// }
// export const queryAll = (sql: string, params: unknown[]): Promise<Record<string, unknown>[]> => {
//   return new Promise((resolve) => {
//     const stmt = dataBase.prepare(sql)
//     stmt.all(params, function(err: Error|null, rows: unknown[]){
//       if (err){
//         console.error(err)
//         resolve([])
//         return
//       }
//       const result = (rows as Record<string, unknown>[]).map(item => convertDb2Biz(item))
//       console.log(`executing sql:${sql}, params:${JSON.stringify(params)}, row:${JSON.stringify(result)}`);
//       resolve(result as Record<string, unknown>[])
//     })
//     stmt.finalize()
//   })
// }
// export const queryCount = (sql: string, params: unknown[]): Promise<number> => {
//   return new Promise((resolve) => {
//     const stmt = dataBase.prepare(sql);
//     stmt.get(params, function (err: Error | null, row: unknown) {
//       if (err) {
//         console.error(err);
//         resolve(0);
//         return;
//       }
//       resolve(row ? Number(Object.values(row)[0]) : 0);
//     });
//     stmt.finalize();
//   });
// };
// export const queryOne = (sql: string, params: unknown[]): Promise<Record<string, unknown> | null> => {
//   return new Promise((resolve) => {
//     const stmt = dataBase.prepare(sql);
//     stmt.get(params, function (err: Error | null, row: unknown) {
//       if (err) {
//         console.error(err);
//         resolve(null);
//         return;
//       }
//       resolve(convertDb2Biz(row as Record<string, unknown>));
//       console.log(`executing sql:${sql}, params:${JSON.stringify(params)}, row:${JSON.stringify(row)}`);
//     });
//     stmt.finalize();
//   });
// };
// export const initTable = () => {
//   dataBase.serialize(async () => {
//     await createTable()
//     await initTableColumnsMap()
//   })
// }
// export const sqliteRun = (sql: string, params: unknown[]): Promise<number> => {
//   return new Promise((resolve, reject) => {
//     const stmt = dataBase.prepare(sql)
//     stmt.run(params, function(err: Error|null){
//       if (err) {
//         console.error(`executing sql: ${sql}, params: ${JSON.stringify(params)}, fail with:${err}`);
//         reject(-1);
//         return;
//       }
//       console.log(`executing sql:${sql}, params:${JSON.stringify(params)}, executing records:${this.changes}`);
//       resolve(this.changes)
//     })
//     stmt.finalize()
//   })
// }
// export const insert = (sqlPrefix: string, tableName: string, data: Record<string, unknown>): Promise<number> => {
//   const columnMap = globalColumnMap[tableName]
//   const columns: string[] = []
//   const params: unknown[] = []
//   for (const item in data){
//     if (data[item] != undefined && columnMap[item] != undefined){
//       columns.push(columnMap[item])
//       params.push(data[item])
//     }
//   }
//   const prepare = Array(columns.length).fill('?').join(',')
//   const sql = `${sqlPrefix} ${tableName}(${columns.join(',')}) values(${prepare})`
//   return sqliteRun(sql, params)
// }
// export const insertOrReplace = (tableName: string, data: Record<string, unknown>): Promise<number> => {
//   return insert('insert or replace into', tableName, data)
// }
// export const insertOrIgnore = (tableName: string, data: Record<string, unknown>): Promise<number> => {
//   return insert('insert or ignore into', tableName, data)
// }
// export const update = (tableName: string, data: Record<string, unknown>, paramData: Record<string, unknown>): Promise<number> => {
//   const columnMap = globalColumnMap[tableName]
//   const columns: string[] = []
//   const params: unknown[] = []
//   const whereColumns: string[] = []
//   for (const item in data){
//     if (data[item] != undefined && columnMap[item] != undefined){
//       columns.push(`${columnMap[item]} = ?`)
//       params.push(data[item])
//     }
//   }
//   for (const item in paramData){
//     if (paramData[item] != undefined && columnMap[item] != undefined){
//       whereColumns.push(`${columnMap[item]} = ?`)
//       params.push(paramData[item]);
//     }
//   }
//   const sql = `update ${tableName} set ${columns.join(',')} ${whereColumns.length > 0 ? ' where ' : ''}${whereColumns.join(' and ')}`
//   return sqliteRun(sql, params)
// }
//
