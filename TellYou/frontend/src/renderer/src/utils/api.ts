interface ApiConfig {
  login: string
  register: string
  getSysSetting: string
}

export const api: ApiConfig = {
  login: "/userAccount/login",
  register: "/account/register",
  getSysSetting: "/account/getSysSetting",
};

