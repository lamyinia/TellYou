
import fs from 'fs'
import {
  existsLocalDB,
  initTable,
  insertOrReplace,
  queryAll,
  setCurrentFolder,
  update
} from './sqlite/sqlite-operation'

export const test = async (): Promise<void> => {
  setCurrentFolder('1')
  existsLocalDB()
  await initTable()

  const raw = fs.readFileSync('./test/test-data.json', 'utf-8')
  const data = JSON.parse(raw)

  for (const session of data.sessions) {
    await insertOrReplace('sessions', session)
  }
  for (const message of data.messages) {
    await insertOrReplace('messages', message)
  }
  for (const black of data.blacklist) {
    await insertOrReplace('blacklist', black)
  }
  for (const apply of data.contact_applications) {
    await insertOrReplace('contact_applications', apply)
  }

  await update('sessions', { contactName: '张三-已更新' }, { sessionId: 1 })
  const sessions = await queryAll('select * from sessions where session_id = ?', [1])
  console.info('sessions:', sessions)
}
