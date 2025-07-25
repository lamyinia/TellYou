"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const os = require("os");
const sqlite3 = require("sqlite3");
const WebSocket = require("ws");
const __Store = require("electron-store");
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
const instanceId = process.env.ELECTRON_INSTANCE_ID;
const NODE_ENV = process.env.NODE_ENV || "production";
const userDir = os.homedir();
const dataFolder = userDir + (NODE_ENV === "development" ? "/.tellyoudev/" : "tellyou/") + `instance_${instanceId}/`;
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
let ws = null;
let maxReConnectTimes = null;
let lockReconnect = false;
let needReconnect = null;
let wsUrl = null;
const initWs = () => {
  wsUrl = "http://localhost:8082/ws";
  console.log(`wsUrl to connect:  ${wsUrl}`);
  needReconnect = true;
  maxReConnectTimes = 20;
};
const reconnect = () => {
  if (!needReconnect) {
    console.log("CONDITION DO NOT NEED RECONNECT");
    return;
  }
  if (ws != null) {
    ws.close();
  }
  if (lockReconnect) {
    return;
  }
  console.log("READY TO RECONNECT");
  lockReconnect = true;
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    console.log("READY TO RECONNECT, RARE TIME:" + maxReConnectTimes);
    --maxReConnectTimes;
    setTimeout(function() {
      connectWs();
      lockReconnect = false;
    }, 5e3);
  } else {
    console.log("TCP CONNECTION TIMEOUT");
  }
};
const connectWs = () => {
  if (wsUrl == null) return;
  const token = store.get("token");
  if (token === null) {
    console.log("NO SATISFIED TOKEN");
    return;
  }
  const urlWithToken = wsUrl.includes("?") ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`;
  ws = new WebSocket(urlWithToken);
  ws.on("open", () => {
    console.log("CLIENT CONNECT SUCCESS");
    ws?.send("PING PING PING");
    maxReConnectTimes = 20;
    setInterval(() => {
      ws.send(JSON.stringify({
        type: "HEARTBEAT",
        fromUserId: "2",
        toUserId: "1948031012054159361",
        content: 1,
        timestamp: Date.now(),
        extra: {
          1: 3,
          2: 4,
          5: 6
        }
      }));
    }, 1e3 * 5);
    setInterval(() => {
      ws.send(JSON.stringify({
        type: "PRIVATE_TEST",
        fromUserId: "2",
        toUserId: "1948031012054159361",
        content: "i do best! i do best! i do best",
        timestamp: Date.now(),
        extra: {
          1: 3,
          2: 4,
          5: 6
        }
      }));
    }, 1e3 * 10);
    const mainWindow = electron.BrowserWindow.getFocusedWindow();
    if (mainWindow) {
      mainWindow.webContents.send("ws-connected");
    }
  });
  ws.on("close", () => {
    console.log("CONNECTION CLOSE, BUT RECONNECTING RIGHT NOW");
    reconnect();
  });
  ws.on("error", () => {
    console.log("CONNECTION FAIL, BUT RECONNECTING RIGHT NOW");
    reconnect();
  });
  ws.on("message", async (data) => {
    console.log("Received message:", data.toString());
  });
};
const onLoginSuccess = (callback) => {
  electron.ipcMain.on("LoginSuccess", (_) => {
    callback();
  });
};
const onLoginOrRegister = (callback) => {
  electron.ipcMain.on("LoginOrRegister", (_, isLogin) => {
    callback(isLogin);
  });
};
const onScreenChange = (callback) => {
  electron.ipcMain.on("window-ChangeScreen", (event, status) => {
    callback(event, status);
  });
};
const Store = __Store.default || __Store;
electron.app.setPath("userData", electron.app.getPath("userData") + "_" + instanceId);
electron.app.whenReady().then(() => {
  electron.ipcMain.on("ping", () => console.log("pong"));
  createDir();
  initTable();
  initWs();
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
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
const loginWidth = 596;
const loginHeight = 400;
const registerHeight = 462;
const store = new Store();
const contextMenu = [
  {
    label: "退出TellYou",
    click: () => {
      electron.app.exit();
    }
  }
];
const menu = electron.Menu.buildFromTemplate(contextMenu);
const createWindow = () => {
  const mainWindow = new electron.BrowserWindow({
    icon,
    width: loginWidth,
    height: loginHeight,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    resizable: false,
    maximizable: false,
    frame: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });
  const tray = new electron.Tray(icon);
  tray.setTitle("TellYou");
  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
  });
  processIpc(mainWindow);
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (utils.is.dev) {
      mainWindow.webContents.openDevTools({ mode: "detach", title: "devTool", activate: false });
      mainWindow.focus();
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
};
const processIpc = (mainWindow) => {
  electron.ipcMain.handle("store-get", (_, key) => {
    return store.get(key);
  });
  electron.ipcMain.handle("store-set", (_, key, value) => {
    store.set(key, value);
    return true;
  });
  electron.ipcMain.handle("store-delete", (_, key) => {
    store.delete(key);
    return true;
  });
  electron.ipcMain.handle("store-clear", () => {
    store.clear();
    return true;
  });
  onLoginOrRegister((isLogin) => {
    mainWindow.setResizable(true);
    if (isLogin === 0) {
      mainWindow.setSize(loginWidth, loginHeight);
    } else {
      mainWindow.setSize(loginWidth, registerHeight);
    }
    mainWindow.setResizable(false);
  });
  onLoginSuccess(() => {
    mainWindow.setResizable(true);
    mainWindow.setSize(920, 740);
    mainWindow.setMaximizable(true);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.center();
    connectWs();
  });
  onScreenChange((event, status) => {
    const webContents = event.sender;
    const win = electron.BrowserWindow.fromWebContents(webContents);
    switch (status) {
      case 0:
        if (win?.isAlwaysOnTop()) {
          win?.setAlwaysOnTop(false);
        } else {
          win?.setAlwaysOnTop(true);
        }
        break;
      case 1:
        win?.minimize();
        break;
      case 2:
        if (win?.isMaximized()) {
          win?.unmaximize();
        } else {
          win?.maximize();
        }
        break;
      case 3:
        win?.setSkipTaskbar(true);
        win?.hide();
        break;
    }
  });
};
exports.store = store;
