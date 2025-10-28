import { defineStore } from "pinia";
import {
  isLoginKey,
  tokenKey,
  uidKey,
  nicknameKey,
  nicknameResidueKey,
  signatureKey,
  signatureResidueKey,
  sexKey,
  sexResidue,
  avatarUrlKey,
  avatarResidueKey,
} from "@main/electron-store/key";

interface LoginResp {
  uid: string;
  token: string;
  nickname: string;
  nicknameResidue: number;
  sex: string;
  sexResidue: number;
  signature: string;
  signatureResidue: number;
  avatarUrl: string;
  avatarResidue: number;
}

export const useUserStore = defineStore("user", {
  state: () => ({
    isLogin: false,
    token: "",
    myId: "",
    nickname: "",
    nicknameResidue: 0,
    sex: "",
    sexResidue: 0,
    signature: "",
    signatureResidue: 0,
    avatarUrl: "",
    avatarResidue: 0,
  }),
  actions: {
    async initStore() {
      this.isLogin =
        ((await window.electronAPI.storeGet(isLoginKey)) as boolean) || false;
      this.token =
        ((await window.electronAPI.storeGet(tokenKey)) as string) || "";
      this.myId = ((await window.electronAPI.storeGet(uidKey)) as string) || "";
      this.nickname =
        ((await window.electronAPI.storeGet(nicknameKey)) as string) || "";
      this.nicknameResidue =
        ((await window.electronAPI.storeGet(nicknameResidueKey)) as number) ||
        0;
      this.sex = ((await window.electronAPI.storeGet(sexKey)) as string) || "";
      this.sexResidue =
        ((await window.electronAPI.storeGet(sexResidue)) as number) || 0;
      this.signature =
        ((await window.electronAPI.storeGet(signatureKey)) as string) || "";
      this.signatureResidue =
        ((await window.electronAPI.storeGet(signatureResidueKey)) as number) ||
        0;
      this.avatarUrl =
        ((await window.electronAPI.storeGet(avatarUrlKey)) as string) || "";
      this.avatarResidue =
        ((await window.electronAPI.storeGet(avatarResidueKey)) as number) || 0;
    },
    async setUserData(data: LoginResp) {
      if (data?.token) {
        await window.electronAPI.storeSet(tokenKey, data.token);
        this.token = data.token;
      }
      if (data?.uid) {
        await window.electronAPI.storeSet(uidKey, data.uid);
        this.myId = data.uid;
      }
      if (data?.nickname !== undefined) {
        await window.electronAPI.storeSet(nicknameKey, data.nickname);
        this.nickname = data.nickname;
      }
      if (data?.nicknameResidue !== undefined) {
        await window.electronAPI.storeSet(
          nicknameResidueKey,
          data.nicknameResidue,
        );
        this.nicknameResidue = data.nicknameResidue;
      }
      if (data?.sex !== undefined) {
        await window.electronAPI.storeSet(sexKey, data.sex);
        this.sex = data.sex;
      }
      if (data?.sexResidue !== undefined) {
        await window.electronAPI.storeSet(sexResidue, data.sexResidue);
        this.sexResidue = data.sexResidue;
      }
      if (data?.signature !== undefined) {
        await window.electronAPI.storeSet(signatureKey, data.signature);
        this.signature = data.signature;
      }
      if (data?.signatureResidue !== undefined) {
        await window.electronAPI.storeSet(
          signatureResidueKey,
          data.signatureResidue,
        );
        this.signatureResidue = data.signatureResidue;
      }
      if (data?.avatarUrl !== undefined) {
        await window.electronAPI.storeSet(avatarUrlKey, data.avatarUrl);
        this.avatarUrl = data.avatarUrl;
      }
      if (data?.avatarResidue !== undefined) {
        await window.electronAPI.storeSet(avatarResidueKey, data.avatarResidue);
        this.avatarResidue = data.avatarResidue;
      }
    },
    async setLoginStatus(status: boolean) {
      this.isLogin = status;
      await window.electronAPI.storeSet(isLoginKey, status);
    },
    async updateUserField(field: string, value: string | number) {
      const keyMap: Record<string, string> = {
        nickname: nicknameKey,
        nicknameResidue: nicknameResidueKey,
        sex: sexKey,
        sexResidue: sexResidue,
        signature: signatureKey,
        signatureResidue: signatureResidueKey,
        avatarUrl: avatarUrlKey,
        avatarResidue: avatarResidueKey,
      };

      if (keyMap[field]) {
        await window.electronAPI.storeSet(keyMap[field], value);
        (this as Record<string, string | number>)[field] = value;
        console.log("keyMap", this.avatarUrl);
      }
    },
    async clearUserData() {
      const keys = [
        isLoginKey,
        tokenKey,
        uidKey,
        nicknameKey,
        nicknameResidueKey,
        sexKey,
        sexResidue,
        signatureKey,
        signatureResidueKey,
        avatarUrlKey,
        avatarResidueKey,
      ];

      for (const key of keys) {
        await window.electronAPI.storeDelete(key);
      }

      this.isLogin = false;
      this.token = "";
      this.myId = "";
      this.nickname = "";
      this.nicknameResidue = 0;
      this.sex = "";
      this.sexResidue = 0;
      this.signature = "";
      this.signatureResidue = 0;
      this.avatarUrl = "";
      this.avatarResidue = 0;
    },
  },
});
