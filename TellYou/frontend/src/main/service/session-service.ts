import { ipcMain } from 'electron'
import { queryAll, sqliteRun, update } from '@main/sqlite/atom'
import { Session } from '@renderer/status/session/class'
import sessionDao from '@main/sqlite/dao/session-dao'

class SessionService {
  public beginServe(): void {
    ipcMain.handle('get-sessions-with-order', async () => {
      try {
        const sql = `
          SELECT *
          FROM sessions
          WHERE contact_type IN (1, 2)
          ORDER BY is_pinned DESC, last_msg_time DESC
        `
        const result = await queryAll(sql, [])
        return result
      } catch (error) {
        console.error('获取会话列表失败:', error)
        return []
      }
    })
    ipcMain.handle('update-session-last-message',
      async (_, sessionId: string | number, content: string, time: Date) => {
        try {
          const sql = `
            UPDATE sessions
            SET last_msg_content = ?,
                last_msg_time    = ?,
                updated_at       = ?
            WHERE session_id = ?
          `
          const result = await sqliteRun(sql, [
            content,
            time.toISOString(),
            new Date().toISOString(),
            String(sessionId)
          ])
          return result > 0
        } catch (error) {
          console.error('更新会话最后消息失败:', error)
          return false
        }
      })
    ipcMain.handle('toggle-session-pin', async (_, sessionId: string | number) => {
      try {
        const sql = `
          UPDATE sessions
          SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END
          WHERE session_id = ?
        `
        const result = await sqliteRun(sql, [String(sessionId)])
        return result > 0
      } catch (error) {
        console.error('切换置顶状态失败:', error)
        return false
      }
    })
    ipcMain.handle('session:update:partial', async (_, params: any, sessionId: string) => {
      return await sessionDao.updatePartial(params, sessionId)
    })
    ipcMain.on('session:load-data', async (event) => {
      console.log('开始查询session')
      const result: Session[] = await sessionDao.selectSessions()
      console.log('查询结果:', result)
      event.sender.send('session:call-back:load-data', result)
    })
  }
  // 整理所有会话的最后一条消息
  public async tidySession(): Promise<void> {

  }
}

export const sessionService = new SessionService()
