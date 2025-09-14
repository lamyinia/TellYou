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
const axios = require("axios");
const log = require("electron-log");
const icon = path.join(__dirname, "../../resources/icon.png");
const add_tables = [
  "create table if not exists sessions(   session_id text primary key,   session_type integer not null,   contact_id text not null,   contact_type integer not null,   contact_name text,   contact_avatar text,   contact_signature text,   last_msg_content text,   last_msg_time datetime,   unread_count integer default 0,   is_pinned integer default 0,   is_muted integer default 0,   created_at datetime,   updated_at datetime,   member_count integer,   max_members integer,   join_mode integer,   msg_mode integer,   group_card text,   group_notification text,   my_role integer,   join_time datetime,   last_active datetime);",
  "create table if not exists messages(   id integer primary key autoincrement,   session_id text not null,   msg_id text not null,   sequence_id text not null,   sender_id text not null,   sender_name text,   msg_type integer not null,   is_recalled integer default 0,   text text,   ext_data text,   send_time datetime not null,   is_read integer default 0,   unique(session_id, sequence_id));",
  "create table if not exists blacklist(   id integer primary key autoincrement,   target_id text not null,   target_type integer not null,   create_time datetime);",
  "create table if not exists contact_applications(   id integer primary key autoincrement,   apply_user_id text not null,   target_id text not null,   contact_type integer not null,   status integer,   apply_info text,   last_apply_time datetime);",
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
const globalColumnMap = {};
const instanceId = process.env.ELECTRON_INSTANCE_ID || "";
const NODE_ENV = process.env.NODE_ENV || "production";
const userDir = os.homedir();
const baseFolder = userDir + (NODE_ENV === "development" ? "/.tellyoudev/" : "tellyou/");
let dataFolder = baseFolder;
let dataBase;
const setCurrentFolder = (userId) => {
  dataFolder = baseFolder + "_" + userId + "/";
  console.info("数据库操作目录 " + dataFolder);
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
        console.error("SQL查询失败", { sql, params, error: err.message, stack: err.stack });
        resolve([]);
        return;
      }
      const result = rows.map((item) => convertDb2Biz(item));
      console.info(sql, params, result);
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
        console.error("SQL查询失败", { sql, params, error: err.message, stack: err.stack });
        reject(-1);
        return;
      }
      console.info(sql, params, this.changes);
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
const insertOrIgnore = (tableName, data) => {
  return insert("insert or ignore into", tableName, data);
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
  console.info(sql);
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
const getMessageId = () => {
  const time = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1e6));
  return (time << 20n | rand).toString();
};
const addLocalMessage = async (data) => {
  const changes = await insertOrIgnore("messages", {
    sessionId: data.sessionId,
    sequenceId: String(data.sequenceId),
    senderId: data.senderId,
    msgId: data.messageId,
    senderName: data.senderName ?? "",
    msgType: data.msgType,
    isRecalled: 0,
    text: data.text ?? "",
    extData: data.extData ?? "",
    sendTime: data.sendTime,
    isRead: data.isRead ?? 1
  });
  if (!changes) return 0;
  const rows = await queryAll(
    "SELECT id FROM messages WHERE session_id = ? AND sequence_id = ? LIMIT 1",
    [data.sessionId, String(data.sequenceId)]
  );
  return rows[0]?.id ?? 0;
};
const getMessageBySessionId = async (sessionId, options) => {
  try {
    const limit = Math.max(1, Math.min(Number(options?.limit) || 50, 200));
    const direction = options?.direction || "newest";
    const beforeId = options?.beforeId;
    const afterId = options?.afterId;
    let where = "WHERE session_id = ?";
    const params = [sessionId];
    if (direction === "older" && beforeId) {
      where += " AND id < ?";
      params.push(beforeId);
    }
    if (direction === "newer" && afterId) {
      where += " AND id > ?";
      params.push(afterId);
    }
    const sql = `
        SELECT id, session_id, sequence_id, sender_id, sender_name, msg_type, is_recalled,
               text, ext_data, send_time, is_read
        FROM messages
        ${where}
        ORDER BY send_time DESC, id DESC
        LIMIT ${limit}
      `;
    const rows = await queryAll(sql, params);
    const messages = rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      content: r.text ?? "",
      messageType: (() => {
        switch (r.msgType) {
          case 1:
            return "text";
          case 2:
            return "image";
          case 5:
            return "file";
          default:
            return "system";
        }
      })(),
      senderId: r.senderId,
      senderName: r.senderName || "",
      senderAvatar: "",
      timestamp: new Date(r.sendTime),
      isRead: !!r.isRead
    }));
    const totalCountRow = await queryAll(
      "SELECT COUNT(1) as total FROM messages WHERE session_id = ?",
      [sessionId]
    );
    const totalCount = totalCountRow[0]?.total || 0;
    let hasMore = false;
    if (messages.length > 0) {
      const lastId = messages[messages.length - 1].id;
      const moreRow = await queryAll(
        "SELECT COUNT(1) as cnt FROM messages WHERE session_id = ? AND id < ?",
        [sessionId, lastId]
      );
      hasMore = (moreRow[0]?.cnt || 0) > 0;
    }
    return { messages, hasMore, totalCount };
  } catch (error) {
    console.error("获取会话消息失败:", error);
    return { messages: [], hasMore: false, totalCount: 0 };
  }
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
const updateSessionByMessage = async (data) => {
  await update("sessions", { lastMsgContent: data.content, lastMsgTime: data.sendTime }, { sessionId: data.sessionId });
};
const handleMessage = async (msg, ws2) => {
  console.log(msg);
  const snap = Number(msg.adjustedTimestamp);
  const insertId = await addLocalMessage({
    sessionId: msg.sessionId,
    sequenceId: msg.sequenceNumber,
    senderId: msg.senderId,
    messageId: msg.messageId,
    senderName: msg.fromName ?? "",
    msgType: 1,
    text: String(msg.content ?? ""),
    extData: JSON.stringify(msg.extra),
    sendTime: new Date(snap).toISOString(),
    isRead: 1
  });
  if (!insertId || insertId <= 0) return;
  const mainWindow = electron.BrowserWindow.getAllWindows()[0];
  await updateSessionByMessage({ content: msg.content, sendTime: new Date(snap).toISOString(), sessionId: msg.sessionId });
  const chatMsg = {
    id: Number(insertId) || 0,
    sessionId: msg.sessionId,
    content: String(msg.content ?? ""),
    messageType: "text",
    senderId: msg.senderId,
    senderName: msg.fromName ?? "",
    senderAvatar: "",
    timestamp: new Date(snap),
    isRead: true
  };
  ws2.send(JSON.stringify({
    messageId: msg.messageId,
    type: 101,
    fromUid: store.get("currentId")
  }));
  const session = (await queryAll("select * from sessions where session_id = ?", [msg.sessionId]))[0];
  mainWindow?.webContents.send("loadMessageDataCallback", msg.sessionId, chatMsg);
  mainWindow?.webContents.send("loadSessionDataCallback", [session]);
};
let ws = null;
let maxReConnectTimes = null;
let lockReconnect = false;
let needReconnect = null;
let wsUrl = null;
const initWs = () => {
  wsUrl = "http://localhost:8082/ws";
  console.info(`wsUrl 连接的url地址:  ${wsUrl}`);
  needReconnect = true;
  maxReConnectTimes = 20;
};
const isWsOpen = () => !!ws && ws.readyState === WebSocket.OPEN;
const sendText = (payload) => {
  if (!isWsOpen()) {
    console.warn("WebSocket 未连接，发送取消");
    throw new Error("WebSocket is not connected");
  }
  const fromUId = String(payload.fromUId || "");
  const toUserId = String(payload.toUserId || "");
  const sessionId = String(payload.sessionId || "");
  const content = payload.content;
  if (!fromUId || !sessionId) {
    console.warn("缺少必要字段 fromUId 或 sessionId，发送取消");
    throw new Error("Missing required fields: fromUId/sessionId");
  }
  let base = {
    messageId: getMessageId(),
    type: 1,
    fromUId,
    toUserId,
    sessionId,
    content,
    timestamp: Date.now(),
    extra: { platform: "desktop" }
  };
  ws.send(JSON.stringify(base));
};
const reconnect = () => {
  if (!needReconnect) {
    console.info("不允许重试服务");
    return;
  }
  console.info("连接关闭，现在正在重试....");
  if (ws != null) {
    ws.close();
  }
  if (lockReconnect) {
    return;
  }
  console.info("重试请求发起");
  lockReconnect = true;
  if (maxReConnectTimes && maxReConnectTimes > 0) {
    console.info("重试请求发起，剩余重试次数:" + maxReConnectTimes);
    --maxReConnectTimes;
    setTimeout(function() {
      connectWs();
      lockReconnect = false;
    }, 5e3);
  } else {
    console.info("TCP 连接超时");
  }
};
const connectWs = () => {
  if (wsUrl == null) return;
  const token = store.get("token");
  if (token === null) {
    console.info("token 不满足条件");
    return;
  }
  const urlWithToken = wsUrl.includes("?") ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`;
  ws = new WebSocket(urlWithToken);
  ws.on("open", () => {
    console.info("客户端连接成功");
    maxReConnectTimes = 20;
    setInterval(() => {
      ws.send(JSON.stringify({
        type: 0,
        fromUid: "2",
        timestamp: Date.now()
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
    const msg = JSON.parse(data);
    switch (msg.messageType) {
      case 1:
        await handleMessage(msg, ws);
        break;
    }
  });
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
  console.log(`正在拉取强事务数据...`);
  try {
    await pullFriendContact();
    await pullApply();
    await pullGroup();
    await pullBlackList();
    await pullOfflineMessage();
    console.log(`拉取强事务数据完成`);
  } catch (error) {
    console.error(`拉取强事务数据失败:`, error);
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
  console.info("sessions:", sessions);
};
const mainAxios = axios.create({
  timeout: 3e4,
  headers: {
    "Content-Type": "application/json"
  }
});
mainAxios.interceptors.request.use((config) => {
  const token = store.get("token");
  if (token) {
    config.headers.token = token;
  }
  return config;
});
const pullOfflineMessages = async () => {
  try {
    console.info("开始拉取用户离线消息...");
    const response = await mainAxios.get(
      `${"http://localhost:8081"}/message/pullMailboxMessage`
    );
    console.log(response);
    return;
    if (!response.data.success) {
      console.error("拉取离线消息失败:", response.data.errMsg);
      return;
    }
    const pullResult = response.data.data;
    if (!pullResult || !pullResult.messageList || pullResult.messageList.length === 0) {
      console.info("没有离线消息需要拉取");
      return;
    }
    console.info(`拉取到 ${pullResult.messageList.length} 条离线消息`);
    const messageIds = [];
    for (const message of pullResult.messageList) {
      try {
        const insertId = await addLocalMessage({
          sessionId: String(message.sessionId),
          sequenceId: message.sequenceNumber || 0,
          senderId: String(message.senderId),
          messageId: message.messageId,
          senderName: "",
          msgType: message.messageType,
          text: message.content,
          extData: JSON.stringify(message.extra || {}),
          sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
          isRead: 0
        });
        if (insertId && insertId > 0) {
          await updateSessionByMessage({
            content: message.content,
            sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
            sessionId: String(message.sessionId)
          });
          messageIds.push(message.messageId);
          const mainWindow = electron.BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            const chatMsg = {
              id: Number(insertId),
              sessionId: message.sessionId,
              content: message.content,
              messageType: "text",
              senderId: message.senderId,
              senderName: "",
              senderAvatar: "",
              timestamp: new Date(Number(message.adjustedTimestamp)),
              isRead: false
            };
            const sessions = await queryAll("select * from sessions where session_id = ?", [String(message.sessionId)]);
            if (sessions.length > 0) {
              mainWindow.webContents.send("loadMessageDataCallback", message.sessionId, chatMsg);
              mainWindow.webContents.send("loadSessionDataCallback", sessions);
            }
          }
        }
      } catch (error) {
        console.error(`处理消息 ${message.messageId} 失败:`, error);
      }
    }
    if (messageIds.length > 0) {
      await ackConfirmMessages(messageIds);
    }
    if (pullResult.hasMore) {
      console.info("还有更多离线消息，继续拉取...");
      setTimeout(() => {
        pullOfflineMessages();
      }, 1e3);
    } else {
      console.info("离线消息拉取完成");
    }
  } catch (error) {
    console.error("拉取离线消息异常:", error);
  }
};
const ackConfirmMessages = async (messageIds) => {
  try {
    const token = store.get("token");
    if (!token) {
      console.warn("Token不存在，跳过消息确认");
      return;
    }
    console.info(`确认 ${messageIds.length} 条消息`);
    const response = await mainAxios.post(
      `${"http://localhost:8082/ws"?.replace("ws://", "http://").replace("wss://", "https://")}/message/ackConfirm`,
      {
        messageIdList: messageIds
      }
    );
    if (response.data.success) {
      console.info("消息确认成功");
    } else {
      console.error("消息确认失败:", response.data.errMsg);
    }
  } catch (error) {
    console.error("消息确认异常:", error);
  }
};
const Store = __Store.default || __Store;
log.transports.file.level = "debug";
log.transports.file.maxSize = 1002430;
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
log.transports.file.resolvePathFn = () => path.join(os.homedir(), ".tellyou", "logs", "main.log");
console.log = log.log;
console.warn = log.warn;
console.error = log.error;
console.info = log.info;
console.debug = log.debug;
electron.app.setPath("userData", electron.app.getPath("userData") + "_" + instanceId);
electron.app.whenReady().then(() => {
  console.info("TellYou应用启动", {
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
    pullOfflineMessages();
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
  electron.ipcMain.handle("ws-send", async (_, msg) => {
    console.log(msg);
    try {
      sendText(msg);
      console.log("发送成功");
      return true;
    } catch (error) {
      console.error("发送消息失败:", error);
      return false;
    }
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
      const result = await sqliteRun(sql, [content, time.toISOString(), (/* @__PURE__ */ new Date()).toISOString(), String(sessionId)]);
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
      const result = await sqliteRun(sql, [String(sessionId)]);
      return result > 0;
    } catch (error) {
      console.error("切换置顶状态失败:", error);
      return false;
    }
  });
  electron.ipcMain.handle("get-message-by-sessionId", (_, sessionId, options) => {
    return getMessageBySessionId(String(sessionId), options);
  });
};
exports.store = store;
