import { ipcMain } from 'electron'
import { selectSessions } from '@main/sqlite/dao/session-dao'
import { Session } from '@renderer/store/session/session-class'

export const onLoadSessionData = ():void => {
  ipcMain.on('loadSessionData', async (event) => {
    console.log("开始查询session");
    const result: Session[] = await selectSessions()
    console.log('查询结果:', result)
    event.sender.send("loadSessionDataCallback", result);
  })
}

export const onLoginSuccess = (callback): void => {
  ipcMain.on('LoginSuccess', (_, uid: string) => {
    callback(uid)
  })
}
export const onLoginOrRegister = (callback): void => {
  ipcMain.on('LoginOrRegister', (_, isLogin: boolean) => {
    callback(isLogin)
  })
}
export const onScreenChange = (callback): void => {
  ipcMain.on('window-ChangeScreen', (event, status: number) => {
    callback(event, status)
  })
}
export const onTest = (callback): void => {
  ipcMain.on('test', (_, __ :string) => {
    callback()
  })
}
