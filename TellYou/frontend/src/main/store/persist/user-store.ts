import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLogin: false,
    token: '',
    myId: -1
  }),
  actions: {
    async initStore() {
      this.isLogin = await window.electronAPI.storeGet('isLogin') || false
      this.token = await window.electronAPI.storeGet('token') || ''
      this.myId = await window.electronAPI.storeGet('currentId') || -1
    },
    async setLoginStatus(status: boolean) {
      this.isLogin = status
      await window.electronAPI.storeSet('isLogin', status)
    },
    async setToken(token: string) {
      this.token = token
      await window.electronAPI.storeSet('token', token)
    },
    async setId(id: number){
      this.myId = id
      await window.electronAPI.storeSet('currentId', id)
    }
  }
})
