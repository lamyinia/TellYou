interface ApiConfig {
  login: string
  register: string
  getSysSetting: string
  pullMessage: string
  ackConfirm: string
}

export const api: ApiConfig = {
  login: "/userAccount/login",
  register: "/account/register",
  getSysSetting: "/account/getSysSetting",
  pullMessage: "/message/pullMailboxMessage",
  ackConfirm: "/message/ackConfirm"
};
