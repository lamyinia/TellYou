interface ApiConfig {
  checkCode: string;
  login: string;
  register: string;
  getSysSetting: string;
  loadMyGroup: string;
  saveGroup: string;
  getGroupInfo: string;
  getGroupInfo4Chat: string;
  dissolutionGroup: string;
  leaveGroup: string;
  addOrRemoveGroupUser: string;
  search: string;
  applyAdd: string;
  loadApply: string;
  dealWithApply: string;
  loadContact: string;
  getContactUserInfo: string;
  addContact2BlackList: string;
  delContact: string;
  getContactInfo: string;
  saveUserInfo: string;
  getUserInfo: string;
  updatePassword: string;
  logout: string;
  sendMessage: string;
  uploadFile: string;
  loadAdminAccount: string;
  updateUserStatus: string;
  forceOffLine: string;
  loadGroup: string;
  adminDissolutionGroup: string;
  saveSysSetting: string;
  getSysSetting4Admin: string;
  loadUpdateDataList: string;
  delUpdate: string;
  saveUpdate: string;
  postUpdate: string;
  loadBeautyAccount: string;
  saveBeautAccount: string;
  delBeautAccount: string;
  checkVersion: string;
}

export const api: ApiConfig = {
  login: "/userAccount/login",
  register: "/account/register",
  getSysSetting: "/account/getSysSetting",
};

