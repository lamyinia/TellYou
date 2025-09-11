import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLogin: false,
    token: '',
    myId: ''
  }),
  actions: {
    async initStore() {
      this.isLogin = await window.electronAPI.storeGet('isLogin') || false
      this.token = await window.electronAPI.storeGet('token') || ''
      this.myId = await window.electronAPI.storeGet('currentId') || '' // 改为字符串
    },
    async setLoginStatus(status: boolean) {
      this.isLogin = status
      await window.electronAPI.storeSet('isLogin', status)
    },
    async setToken(token: string) {
      this.token = token
      await window.electronAPI.storeSet('token', token)
    },
    async setId(id: string){ // 参数改为字符串类型
      console.log('我的id: ' + id)
      this.myId = id
      await window.electronAPI.storeSet('currentId', id)
    }
  }
})
