import { ipcMain } from 'electron'


export const onLoginSuccess = (callback): void => {
  ipcMain.on('LoginSuccess', (_) => {
    callback()
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
