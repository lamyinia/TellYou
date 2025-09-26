import { ipcMain } from 'electron'


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
