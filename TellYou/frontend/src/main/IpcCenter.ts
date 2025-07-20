import { ipcMain } from 'electron'

export const onLoginSuccess = (callback) => {
  ipcMain.on('LoginSuccess', (_) => {
    callback()
  })
}
export const onLoginOrRegister = (callback) => {
  ipcMain.on('LoginOrRegister', (_, isLogin: boolean) => {
    callback(isLogin)
  })
}
