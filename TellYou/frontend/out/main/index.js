"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const fs = require("fs");
const os = require("os");
const sqlite3 = require("sqlite3");
const child_process = require("child_process");
const WebSocket = require("ws");
const __Store = require("electron-store");
const icon = path.join(__dirname, "../../resources/icon.png");
const add_tables = [
  "create table if not exists sessions(   session_id integer primary key,   session_type integer not null,   contact_id integer not null,   contact_type integer not null,   contact_name text,   contact_avatar text,   contact_signature text,   last_msg_content text,   last_msg_time datetime,   unread_count integer default 0,   is_pinned integer default 0,   is_muted integer default 0,   created_at datetime,   updated_at datetime,   member_count integer,   max_members integer,   join_mode integer,   msg_mode integer,   group_card text,   group_notification text,   my_role integer,   join_time datetime,   last_active datetime);",
  "create table if not exists messages(   id integer primary key autoincrement,   session_id integer not null,   sequence_id integer not null,   sender_id integer not null,   sender_name text,   msg_type integer not null,   is_recalled integer default 0,   text text,   ext_data text,   send_time datetime not null,   is_read integer default 0,   unique(session_id, sequence_id));",
  "create table if not exists blacklist(   id integer primary key autoincrement,   target_id integer not null,   target_type integer not null,   create_time datetime);",
  "create table if not exists contact_applications(   id integer primary key autoincrement,   apply_user_id integer not null,   target_id integer not null,   contact_type integer not null,   status integer,   apply_info text,   last_apply_time datetime);",
  "create table if not exists user_setting (   user_id varchar not null,   email varchar not null,   sys_setting varchar,   contact_no_read integer,   server_port integer,   primary key (user_id));"
];
const add_indexes = [
  "create index if not exists idx_sessions_type_time on sessions(session_type, last_msg_time desc);",
  "create index if not exists idx_sessions_contact on sessions(contact_id, contact_type);",
  "create index if not exists idx_sessions_unread on sessions(unread_count desc, last_msg_time desc);",
  "create index if not exists idx_messages_session_time on messages(session_id, send_time desc);",
  "create index if not exists idx_messages_sender on messages(sender_id);",
  "create index if not exists idx_blacklist_target on blacklist(target_id, target_type);",
  "create index if not exists idx_applications_user_target on contact_applications(apply_user_id, target_id, contact_type);",
  "create index if not exists idx_applications_status on contact_applications(status);"
];
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["FATAL"] = 4] = "FATAL";
  return LogLevel2;
})(LogLevel || {});
const colors = {
  reset: "\x1B[0m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m"
};
class Logger {
  static instance;
  logLevel;
  logDir;
  logFile;
  enableColors;
  constructor() {
    this.ensureConsoleEncoding();
    this.logLevel = 1;
    this.logDir = path.join(os.homedir(), ".tellyou", "logs");
    this.logFile = path.join(this.logDir, `tellyou-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.log`);
    this.enableColors = true;
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  ensureConsoleEncoding() {
    if (process.platform === "win32") {
      try {
        child_process.execSync("reg add HKEY_CURRENT_USER\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f", { stdio: "ignore" });
      } catch {
      }
    }
  }
  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  setLevel(level) {
    this.logLevel = level;
  }
  setEnableColors(enable) {
    this.enableColors = enable;
  }
  colorize(text, color) {
    return this.enableColors ? `${color}${text}${colors.reset}` : text;
  }
  getLevelColor(level) {
    switch (level.toLowerCase()) {
      case "debug":
        return colors.gray;
      case "info":
        return colors.green;
      case "warn":
        return colors.yellow;
      case "error":
        return colors.red;
      case "fatal":
        return colors.magenta;
      default:
        return colors.white;
    }
  }
  formatTimestamp() {
    const now = /* @__PURE__ */ new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];
    return `${date} ${time}`;
  }
  writeLog(level, message, data) {
    if (this.logLevel > this.getLogLevel(level)) {
      return;
    }
    const timestamp = this.formatTimestamp();
    const levelUpper = level.toUpperCase();
    const levelColor = this.getLevelColor(level);
    const consoleMessage = `${this.colorize(`[${timestamp}]`, colors.cyan)} ${this.colorize(levelUpper.padEnd(5), levelColor)} ${message}`;
    if (data) {
      console.log(consoleMessage, data);
    } else {
      console.log(consoleMessage);
    }
    const logEntry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: levelUpper,
      message,
      data: data || null,
      pid: process.pid
    };
    const logLine = JSON.stringify(logEntry, null, 2) + "\n";
    try {
      fs.appendFileSync(this.logFile, logLine, "utf8");
    } catch (error) {
      console.error("写入日志文件失败:", error);
    }
  }
  getLogLevel(level) {
    switch (level.toLowerCase()) {
      case "debug":
        return 0;
      case "info":
        return 1;
      case "warn":
        return 2;
      case "error":
        return 3;
      case "fatal":
        return 4;
      default:
        return 1;
    }
  }
  debug(message, data) {
    this.writeLog("debug", message, data);
  }
  info(message, data) {
    this.writeLog("info", message, data);
  }
  warn(message, data) {
    this.writeLog("warn", message, data);
  }
  error(message, error) {
    this.writeLog("error", message, error);
  }
  fatal(message, error) {
    this.writeLog("fatal", message, error);
  }
  // SQL查询专用日志
  sql(sql, params, result) {
    const message = `SQL执行: ${sql}`;
    const data = { params, result };
    this.writeLog("debug", message, data);
  }
  // 数据库操作专用日志
  db(operation, table, data) {
    const message = `数据库操作: ${operation} -> ${table}`;
    this.writeLog("debug", message, data);
  }
  // 网络请求专用日志
  network(method, url, status, data) {
    const message = `${method} ${url}${status ? ` (${status})` : ""}`;
    this.writeLog("info", message, data);
  }
  getLogFilePath() {
    return this.logFile;
  }
  cleanOldLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = /* @__PURE__ */ new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          this.info(`删除旧日志文件: ${file}`);
        }
      });
    } catch (error) {
      this.error("清理日志文件失败", error);
    }
  }
}
const logger = Logger.getInstance();
const globalColumnMap = {};
const instanceId = process.env.ELECTRON_INSTANCE_ID || "";
const NODE_ENV = process.env.NODE_ENV || "production";
const userDir = os.homedir();
const baseFolder = userDir + (NODE_ENV === "development" ? "/.tellyoudev/" : "tellyou/");
let dataFolder = baseFolder;
let dataBase;
const setCurrentFolder = (userId) => {
  dataFolder = baseFolder + "_" + userId + "/";
  logger.info("数据库操作目录 " + dataFolder);
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
  }
};
const existsLocalDB = () => {
  const result = fs.existsSync(dataFolder + "local.db");
  dataBase = NODE_ENV === "development" ? new (sqlite3.verbose()).Database(dataFolder + "local.db") : new sqlite3.Database(dataFolder + "local.db");
  return result;
};
const initTable = async () => {
  dataBase.serialize(async () => {
    await createTable();
  });
  await initTableColumnsMap();
};
const queryAll = (sql, params) => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql);
    stmt.all(params, function(err, rows) {
      if (err) {
        logger.error("SQL查询失败", { sql, params, error: err.message, stack: err.stack });
        resolve([]);
        return;
      }
      const result = rows.map((item) => convertDb2Biz(item));
      logger.sql(sql, params, result);
      resolve(result);
    });
    stmt.finalize();
  });
};
const sqliteRun = (sql, params) => {
  return new Promise((resolve, reject) => {
    const stmt = dataBase.prepare(sql);
    stmt.run(params, function(err) {
      if (err) {
        logger.error("SQL查询失败", { sql, params, error: err.message, stack: err.stack });
        reject(-1);
        return;
      }
      logger.sql(sql, params, this.changes);
      resolve(this.changes);
    });
    stmt.finalize();
  });
};
const insert = (sqlPrefix, tableName, data) => {
  const columnMap = globalColumnMap[tableName];
  const columns = [];
  const params = [];
  for (const item in data) {
    if (data[item] != void 0 && columnMap[item] != void 0) {
      columns.push(columnMap[item]);
      params.push(data[item]);
    }
  }
  const prepare = Array(columns.length).fill("?").join(",");
  const sql = `${sqlPrefix} ${tableName}(${columns.join(",")}) values(${prepare})`;
  return sqliteRun(sql, params);
};
const insertOrReplace = (tableName, data) => {
  console.log(data);
  return insert("insert or replace into", tableName, data);
};
const update = (tableName, data, paramData) => {
  const columnMap = globalColumnMap[tableName];
  const columns = [];
  const params = [];
  const whereColumns = [];
  for (const item in data) {
    if (data[item] != void 0 && columnMap[item] != void 0) {
      columns.push(`${columnMap[item]} = ?`);
      params.push(data[item]);
    }
  }
  for (const item in paramData) {
    if (paramData[item] != void 0 && columnMap[item] != void 0) {
      whereColumns.push(`${columnMap[item]} = ?`);
      params.push(paramData[item]);
    }
  }
  const sql = `update ${tableName}
               set ${columns.join(",")} ${whereColumns.length > 0 ? " where " : ""}${whereColumns.join(" and ")}`;
  logger.info(sql);
  return sqliteRun(sql, params);
};
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
  const add_table = async () => {
    for (const item of add_tables) {
      dataBase.run(item);
    }
  };
  const add_index = async () => {
    for (const item of add_indexes) {
      dataBase.run(item);
    }
  };
  await add_table();
  await add_index();
};
const initTableColumnsMap = async () => {
  let sql = "select name from sqlite_master where type = 'table' and name != 'sqlite_sequence'";
  const tables = await queryAll(sql, []);
  for (let i = 0; i < tables.length; ++i) {
    sql = `PRAGMA table_info(${tables[i].name})`;
    const columns = await queryAll(sql, []);
    const columnsMapItem = {};
    for (let j = 0; j < columns.length; j++) {
      columnsMapItem[toCamelCase(columns[j].name)] = columns[j].name;
    }
    globalColumnMap[tables[i].name] = columnsMapItem;
  }
};
let ws = null;
let maxReConnectTimes = null;
let lockReconnect = false;
let needReconnect = null;
let wsUrl = null;
const initWs = () => {
  wsUrl = "http://localhost:8082/ws";
  logger.debug(`wsUrl 连接的url地址:  ${wsUrl}`);
  needReconnect = true;
  maxReConnectTimes = 20;
};
const reconnect = () => {
  if (!needReconnect) {
    logger.info("不允许重试服务");
    return;
  }
  logger.info("连接关闭，现在正在重试....");
  if (ws != null) {
    ws.close();
  }
  if (lockReconnect) {
    return;
  }
  logger.info("重试请求发起");
  lockReconnect = true;
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    logger.info("重试请求发起，剩余重试次数:" + maxReConnectTimes);
    --maxReConnectTimes;
    setTimeout(function() {
      connectWs();
      lockReconnect = false;
    }, 5e3);
  } else {
    logger.info("TCP 连接超时");
  }
};
const connectWs = () => {
  if (wsUrl == null) return;
  const token = store.get("token");
  if (token === null) {
    logger.info("token 不满足条件");
    return;
  }
  const urlWithToken = wsUrl.includes("?") ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`;
  ws = new WebSocket(urlWithToken);
  ws.on("open", () => {
    logger.info("客户端连接成功");
    maxReConnectTimes = 20;
    setInterval(() => {
      ws.send(JSON.stringify({
        messageId: 1,
        type: 0,
        fromUserId: "2",
        toUserId: 1,
        sessionId: 1,
        content: 1,
        timestamp: Date.now(),
        extra: {
          something: "nothing"
        }
      }));
    }, 1e3 * 5);
    const mainWindow = electron.BrowserWindow.getFocusedWindow();
    if (mainWindow) {
      mainWindow.webContents.send("ws-connected");
    }
  });
  ws.on("close", () => {
    reconnect();
  });
  ws.on("error", () => {
    reconnect();
  });
  ws.on("message", async (data) => {
    console.log("收到消息:", data.toString());
  });
};
const selectSessions = async () => {
  const sql = `
    SELECT
      session_id,
      contact_id,
      contact_type,
      contact_name,
      contact_avatar,
      contact_signature,
      last_msg_content,
      last_msg_time,
      unread_count,
      is_pinned,
      is_muted,
      created_at,
      updated_at,
      member_count,
      max_members,
      join_mode,
      msg_mode,
      group_card,
      group_notification,
      my_role,
      join_time,
      last_active
    FROM sessions
  `;
  const result = await queryAll(sql, []);
  return result;
};
const onLoadSessionData = () => {
  electron.ipcMain.on("loadSessionData", async (event) => {
    console.log("开始查询session");
    const result = await selectSessions();
    console.log("查询结果:", result);
    event.sender.send("loadSessionDataCallback", result);
  });
};
const onLoginSuccess = (callback) => {
  electron.ipcMain.on("LoginSuccess", (_, uid) => {
    callback(uid);
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
const onTest = (callback) => {
  electron.ipcMain.on("test", (_, __) => {
    callback();
  });
};
const initializeUserData = async (uid) => {
  connectWs();
  setCurrentFolder(uid);
  const everCreated = existsLocalDB();
  await initTable();
  await pullStrongTransactionData();
  if (!everCreated) {
    await pullHistoryMessage();
  }
};
const pullStrongTransactionData = async () => {
  logger.info(`正在拉取强事务数据...`);
  try {
    await pullFriendContact();
    await pullApply();
    await pullGroup();
    await pullBlackList();
    await pullOfflineMessage();
    logger.info(`拉取强事务数据完成`);
  } catch (error) {
    logger.info(`拉取强事务数据失败:`, error);
    throw error;
  }
};
const pullFriendContact = async () => {
};
const pullApply = async () => {
};
const pullGroup = async () => {
};
const pullBlackList = async () => {
};
const pullOfflineMessage = async () => {
};
const pullHistoryMessage = async () => {
  console.log(`正在拉取历史消息...`);
};
const test = async () => {
  setCurrentFolder("1");
  existsLocalDB();
  await initTable();
  const raw = fs.readFileSync("./test/test-data.json", "utf-8");
  const data = JSON.parse(raw);
  for (const session of data.sessions) {
    await insertOrReplace("sessions", session);
  }
  for (const message of data.messages) {
    await insertOrReplace("messages", message);
  }
  for (const black of data.blacklist) {
    await insertOrReplace("blacklist", black);
  }
  for (const apply of data.contact_applications) {
    await insertOrReplace("contact_applications", apply);
  }
  await update("sessions", { contactName: "张三-已更新" }, { sessionId: 1 });
  const sessions = await queryAll("select * from sessions where session_id = ?", [1]);
  logger.info("sessions:", sessions);
};
const Store = __Store.default || __Store;
electron.app.setPath("userData", electron.app.getPath("userData") + "_" + instanceId);
electron.app.whenReady().then(() => {
  if (process.env.NODE_ENV === "development") {
    logger.setLevel(LogLevel.DEBUG);
  } else {
    logger.setLevel(LogLevel.INFO);
  }
  logger.info("TellYou应用启动", {
    version: electron.app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  });
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
const registerWidth = 596;
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
  invokeHandle();
  onLoadSessionData();
  onLoginOrRegister((isLogin) => {
    mainWindow.setResizable(true);
    if (isLogin === 0) {
      mainWindow.setSize(loginWidth, loginHeight);
    } else {
      mainWindow.setSize(registerWidth, registerHeight);
    }
    mainWindow.setResizable(false);
  });
  onLoginSuccess((uid) => {
    mainWindow.setResizable(true);
    mainWindow.setSize(920, 740);
    mainWindow.setMaximizable(true);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.center();
    initializeUserData(uid);
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
  onTest(() => {
    test();
  });
};
const invokeHandle = () => {
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
  electron.ipcMain.handle("get-sessions-with-order", async () => {
    try {
      const sql = `
        SELECT *
        FROM sessions
        WHERE contact_type IN (1, 2)
        ORDER BY is_pinned DESC, last_msg_time DESC
      `;
      const result = await queryAll(sql, []);
      return result;
    } catch (error) {
      console.error("获取会话列表失败:", error);
      return [];
    }
  });
  electron.ipcMain.handle("update-session-last-message", async (_, sessionId, content, time) => {
    try {
      const sql = `
        UPDATE sessions
        SET last_msg_content = ?,
            last_msg_time    = ?,
            updated_at       = ?
        WHERE session_id = ?
      `;
      const result = await sqliteRun(sql, [content, time.toISOString(), (/* @__PURE__ */ new Date()).toISOString(), sessionId]);
      return result > 0;
    } catch (error) {
      console.error("更新会话最后消息失败:", error);
      return false;
    }
  });
  electron.ipcMain.handle("toggle-session-pin", async (_, sessionId) => {
    try {
      const sql = `
        UPDATE sessions
        SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END
        WHERE session_id = ?
      `;
      const result = await sqliteRun(sql, [sessionId]);
      return result > 0;
    } catch (error) {
      console.error("切换置顶状态失败:", error);
      return false;
    }
  });
  electron.ipcMain.handle("get-message-by-sessionId", (_) => {
  });
};
exports.store = store;
