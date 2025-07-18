"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const os = require("os");
const sqlite3 = require("sqlite3");
const icon = path.join(__dirname, "../../resources/icon.png");
const add_tables = [
  "create table if not exists  chat_message(   user_id varchar not null,   message_id bigint not null default null,   session_id varchar,   message_type integer,   message_content varchar,   contact_type integer,   send_user_id varchar,   send_user_nick_name varchar,   send_time bigint,   status integer,   file_size bigint,   file_name varchar,   file_path varchar,   file_type integer,   primary key(user_id, message_id));",
  "create table if not exists chat_session_user(   user_id varchar not null default 0,   contact_id varchar(11) not null,   contact_type integer,   session_id varchar(11),   status integer default 1,   contact_name varchar(20),   last_message varchar(500),   last_receive_time bigint,   no_read_count integer default 0,   member_count integer,   top_type integer default 0,   primary key (user_id, contact_id));",
  "create table if not exists user_setting (   user_id varchar not null,   email varchar not null,   sys_setting varchar,   contact_no_read integer,   server_port integer,   primary key (user_id));"
];
const add_indexes = [
  "create index if not exists idx_session_id on chat_message( session_id asc);"
];
const globalColumnMap = {};
const NODE_ENV = process.env.NODE_ENV || "production";
const userDir = os.homedir();
const dataFolder = userDir + (NODE_ENV === "development" ? "/.tellyoudev/" : "tellyou/");
var dataBase;
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (_, p1) => p1.toUpperCase());
};
const convertDb2Biz = (data) => {
  if (!data) return null;
  const bizData = {};
  for (const item in data) {
    bizData[toCamelCase(item)] = data[item];
  }
  return bizData;
};
const createTable = async () => {
  for (const item of add_tables) {
    await dataBase.run(item);
  }
  for (const item of add_indexes) {
    await dataBase.run(item);
  }
};
const initTableColumnsMap = async () => {
  let sql = "select name from sqlite_master where type = 'table' and name != 'sqlite_sequence'";
  let tables = await queryAll(sql, []);
  for (let i = 0; i < tables.length; ++i) {
    sql = `PRAGMA table_info(${tables[i].name})`;
    let columns = await queryAll(sql, []);
    const columnsMapItem = {};
    for (let j = 0; j < columns.length; j++) {
      columnsMapItem[toCamelCase(columns[j].name)] = columns[j].name;
    }
    globalColumnMap[tables[i].name] = columnsMapItem;
  }
  console.log(globalColumnMap);
};
const createDir = () => {
  console.log(dataFolder);
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
  }
  dataBase = NODE_ENV === "development" ? new (sqlite3.verbose()).Database(dataFolder + "local.db") : new sqlite3.Database(dataFolder + "local.db");
};
const queryAll = (sql, params) => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql);
    stmt.all(params, function(err, rows) {
      if (err) {
        console.error(err);
        resolve([]);
        return;
      }
      const result = rows.map((item) => convertDb2Biz(item));
      console.log(`executing sql:${sql}, params:${JSON.stringify(params)}, row:${JSON.stringify(result)}`);
      resolve(result);
    });
    stmt.finalize();
  });
};
const initTable = () => {
  dataBase.serialize(async () => {
    await createTable();
    await initTableColumnsMap();
  });
};
const loginWidth = 596;
const loginHeight = 400;
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    icon,
    width: loginWidth,
    height: loginHeight,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (utils.is.dev) {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  createDir();
  initTable();
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.ipcMain.on("ping", () => console.log("pong"));
  electron.ipcMain.on("loginOrRegister", (event, isLogin) => {
    console.log(event);
    console.log("loginOrRegister " + isLogin);
  });
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
