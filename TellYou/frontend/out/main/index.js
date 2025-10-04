"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const __Store = require("electron-store");
const log = require("electron-log");
const os = require("os");
const fs = require("fs");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const sqlite3 = require("sqlite3");
const WebSocket = require("ws");
const sharp = require("sharp");
const icon = path.join(__dirname, "../../resources/icon.png");
const getMimeType = (ext) => {
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp"
  };
  return mimeTypes[ext] || "application/octet-stream";
};
const generateThumbnail = async (filePath) => {
  try {
    const sharp2 = await import("sharp");
    const thumbnailBuffer = await sharp2.default(filePath).resize(200, 200, {
      fit: "cover",
      position: "center"
    }).jpeg({ quality: 80 }).toBuffer();
    return thumbnailBuffer;
  } catch (error) {
    console.error("生成缩略图失败:", error);
    return await fs.promises.readFile(filePath);
  }
};
class MediaTaskService {
  tasks = /* @__PURE__ */ new Map();
  tempDir = "";
  CHUNK_SIZE = 5 * 1024 * 1024;
  // 5MB 分块
  MAX_CONCURRENT = 3;
  // 最大并发上传数
  RETRY_TIMES = 3;
  // 重试次数
  beginServe() {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    this.tempDir = path.join(electron.app.getPath("userData"), ".tellyou", "media", "temp");
    this.ensureTempDir();
    this.setupIpcHandlers();
  }
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  setupIpcHandlers() {
    electron.ipcMain.handle("media:send:start", async (event, params) => {
      return this.startTask(params);
    });
    electron.ipcMain.handle("media:send:cancel", async (event, taskId) => {
      return this.cancelTask(taskId);
    });
    electron.ipcMain.handle("media:send:retry", async (event, taskId) => {
      return this.retryTask(taskId);
    });
    electron.ipcMain.handle("media:send:status", async (event, taskId) => {
      return this.getTaskStatus(taskId);
    });
    electron.ipcMain.handle("media:send:list", async () => {
      return this.getAllTasks();
    });
    electron.ipcMain.handle("avatar:select-file", async () => {
      try {
        const { dialog } = await import("electron");
        const result = await dialog.showOpenDialog({
          title: "选择头像文件",
          filters: [{ name: "图片文件", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
          properties: ["openFile"]
        });
        if (result.canceled || result.filePaths.length === 0) {
          return null;
        }
        const filePath = result.filePaths[0];
        const stats = await fs.promises.stat(filePath);
        const maxSize = 10 * 1024 * 1024;
        if (stats.size > maxSize) {
          throw new Error(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`);
        }
        const ext = path.extname(filePath).toLowerCase();
        const allowedExts = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
        if (!allowedExts.includes(ext)) {
          throw new Error("只支持 .png, .jpg, .jpeg, .gif, .webp 格式的图片");
        }
        const fileBuffer = await fs.promises.readFile(filePath);
        const base64Data = fileBuffer.toString("base64");
        const dataUrl = `data:${getMimeType(ext)};base64,${base64Data}`;
        return {
          filePath,
          fileName: path.basename(filePath),
          fileSize: stats.size,
          fileSuffix: ext,
          mimeType: getMimeType(ext),
          dataUrl
        };
      } catch (error) {
        console.error("Failed to select avatar file:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("avatar:upload", async (_, { filePath, fileSize, fileSuffix }) => {
      try {
        const { getUploadUrl, uploadFile, confirmUpload } = await Promise.resolve().then(() => require("./avatar-upload-service-A3zHNMwX.js"));
        console.log("开始上传头像:", { filePath, fileSize, fileSuffix });
        const uploadUrls = await getUploadUrl(fileSize, fileSuffix);
        const originalFileBuffer = await fs.promises.readFile(filePath);
        const thumbnailBuffer = await generateThumbnail(filePath);
        await uploadFile(uploadUrls.originalUploadUrl, originalFileBuffer, getMimeType(fileSuffix));
        await uploadFile(uploadUrls.thumbnailUploadUrl, thumbnailBuffer, "image/jpeg");
        await confirmUpload();
        console.log("确认上传完成头像URL:", uploadUrls.originalUploadUrl);
        return {
          success: true,
          avatarUrl: uploadUrls.originalUploadUrl.split("?")[0]
        };
      } catch (error) {
        console.error("Failed to upload avatar:", error);
        throw error;
      }
    });
  }
  async startTask(params) {
    try {
      const taskId = this.generateTaskId();
      const fileStats = fs.statSync(params.filePath);
      const task = {
        id: taskId,
        type: params.type,
        filePath: params.filePath,
        fileName: params.fileName,
        fileSize: fileStats.size,
        mimeType: params.mimeType,
        status: "pending",
        progress: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.tasks.set(taskId, task);
      this.processTask(taskId).catch((err) => {
        log.error("Media task processing failed:", err);
      });
      return { taskId, success: true };
    } catch (error) {
      log.error("Failed to start media task:", error);
      return {
        taskId: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  async processTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    try {
      await this.getUploadUrls(task);
      await this.uploadFile(task);
      await this.commitUpload(task);
      task.status = "completed";
      task.progress = 100;
      task.updatedAt = Date.now();
      this.notifyRenderer("media:send:result", {
        taskId,
        success: true,
        result: task.result
      });
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Upload failed";
      task.updatedAt = Date.now();
      this.notifyRenderer("media:send:result", {
        taskId,
        success: false,
        error: task.error
      });
    }
  }
  async getUploadUrls(task) {
    const response = await axios.post("/api/media/upload-token", {
      fileName: task.fileName,
      fileSize: task.fileSize,
      mimeType: task.mimeType,
      type: task.type
    });
    task.uploadUrls = {
      origin: response.data.originUrl,
      thumbnail: response.data.thumbnailUrl
    };
  }
  async uploadFile(task) {
    if (!task.uploadUrls) {
      throw new Error("Upload URLs not available");
    }
    task.status = "uploading";
    this.notifyRenderer("media:send:state", {
      taskId: task.id,
      status: task.status,
      progress: task.progress
    });
    const fileSize = task.fileSize;
    const chunkSize = this.CHUNK_SIZE;
    const totalChunks = Math.ceil(fileSize / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      if (task.status === "cancelled") {
        throw new Error("Upload cancelled");
      }
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = fs.createReadStream(task.filePath, { start, end });
      await this.uploadChunk(task, chunk, i, totalChunks);
      task.progress = Math.round((i + 1) / totalChunks * 80);
      task.chunkCursor = i + 1;
      task.updatedAt = Date.now();
      this.notifyRenderer("media:send:progress", {
        taskId: task.id,
        progress: task.progress,
        chunkCursor: task.chunkCursor
      });
    }
  }
  async uploadChunk(task, chunk, chunkIndex, totalChunks) {
    const formData = new FormData();
    formData.append("file", chunk, `${task.fileName}.part${chunkIndex}`);
    formData.append("chunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    await axios.post(task.uploadUrls.origin, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      timeout: 3e4
    });
  }
  async commitUpload(task) {
    const response = await axios.post("/api/media/commit", {
      fileName: task.fileName,
      fileSize: task.fileSize,
      mimeType: task.mimeType,
      type: task.type
    });
    task.result = {
      originUrl: response.data.originUrl,
      thumbnailUrl: response.data.thumbnailUrl,
      fileId: response.data.fileId
    };
  }
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = "cancelled";
    task.updatedAt = Date.now();
    this.notifyRenderer("media:send:state", {
      taskId,
      status: task.status,
      progress: task.progress
    });
    return true;
  }
  // 重试任务
  async retryTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = "pending";
    task.progress = 0;
    task.error = void 0;
    task.updatedAt = Date.now();
    this.processTask(taskId).catch((err) => {
      log.error("Retry task failed:", err);
    });
    return true;
  }
  // 获取任务状态
  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }
  // 获取所有任务
  getAllTasks() {
    return Array.from(this.tasks.values());
  }
  // 通知渲染进程
  notifyRenderer(channel, data) {
    log.info(`Notifying renderer: ${channel}`, data);
  }
  // 生成任务ID
  generateTaskId() {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
const mediaTaskService = new MediaTaskService();
class JsonStoreService {
  beginServe() {
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
  }
}
const jsonStoreService = new JsonStoreService();
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
class UrlUtil {
  protocolHost = ["avatar", "picture", "voice", "video", "file"];
  mimeByExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };
  nodeEnv = process.env.NODE_ENV || "production";
  homeDir = os.homedir();
  appPath = path.join(this.homeDir, this.nodeEnv === "development" ? ".tellyoudev" : ".tellyou");
  tempPath = path.join(this.appPath, "temp");
  sqlPath = this.appPath;
  atomPath = process.env.VITE_REQUEST_OBJECT_ATOM || "";
  instanceId = process.env.ELECTRON_INSTANCE_ID || "";
  cacheRootPath = "";
  cachePaths = {
    "avatar": "",
    "picture": "",
    "voice": "",
    "video": "",
    "file": ""
  };
  ensureDir(path2) {
    if (!fs.existsSync(path2)) {
      console.info("debug:ensureDir   ", path2);
      fs.mkdirSync(path2, { recursive: true });
    }
  }
  init() {
    this.cacheRootPath = path.join(electron.app.getPath("userData"), "caching");
    this.tempPath = path.join(electron.app.getPath("userData"), "temp");
    this.protocolHost.forEach((host) => {
      this.cachePaths[host] = path.join(this.cacheRootPath, host);
      this.ensureDir(this.cachePaths[host]);
    });
  }
  registerProtocol() {
    electron.protocol.handle("tellyou", async (request) => {
      try {
        const url = new URL(request.url);
        if (!this.protocolHost.includes(url.hostname)) return new Response("", { status: 403 });
        const filePath = decodeURIComponent(url.searchParams.get("path") || "");
        const normalized = path.resolve(filePath);
        const rootResolved = path.resolve(this.cacheRootPath);
        const hasAccess = normalized.toLowerCase().startsWith((rootResolved + path.sep).toLowerCase()) || normalized.toLowerCase() === rootResolved.toLowerCase();
        if (!hasAccess) {
          console.error("tellyou protocol denied:", { normalized, rootResolved });
          return new Response("", { status: 403 });
        }
        const ext = path.extname(normalized).toLowerCase();
        const mime = this.mimeByExt[ext] || "application/octet-stream";
        const data = await fs.promises.readFile(normalized);
        return new Response(data, { headers: { "content-type": mime, "Access-Control-Allow-Origin": "*" } });
      } catch (e) {
        console.error("tellyou protocol error:", e);
        return new Response("", { status: 500 });
      }
    });
  }
  redirectSqlPath(userId) {
    this.sqlPath = path.join(this.appPath, "_" + userId);
    console.info("数据库操作目录 " + this.sqlPath);
    if (!fs.existsSync(this.sqlPath)) {
      fs.mkdirSync(this.sqlPath, { recursive: true });
    }
  }
  signByApp(path2) {
    return `tellyou://avatar?path=${encodeURIComponent(path2)}`;
  }
}
const urlUtil = new UrlUtil();
const globalColumnMap = {};
let dataBase;
const redirectDataBase = () => {
  const path$1 = path.join(urlUtil.sqlPath, "local.db");
  const result = fs.existsSync(path$1);
  dataBase = urlUtil.nodeEnv === "development" ? new (sqlite3.verbose()).Database(path$1) : new sqlite3.Database(path$1);
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
class ApplicationDao {
  async loadIncomingApplications(pageNo, pageSize, currentUserId) {
    const offset = (pageNo - 1) * pageSize;
    const where = currentUserId ? "WHERE target_id = ?" : "";
    const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset];
    const rows = await queryAll(`
    SELECT * FROM contact_applications
    ${where}
    ORDER BY last_apply_time DESC
    LIMIT ? OFFSET ?
  `, params);
    const totalRow = await queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`, currentUserId ? [currentUserId] : []);
    return { list: rows, total: totalRow[0]?.total || 0 };
  }
  async loadOutgoingApplications(pageNo, pageSize, currentUserId) {
    const offset = (pageNo - 1) * pageSize;
    const where = currentUserId ? "WHERE apply_user_id = ?" : "";
    const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset];
    const rows = await queryAll(`
    SELECT * FROM contact_applications
    ${where}
    ORDER BY last_apply_time DESC
    LIMIT ? OFFSET ?
  `, params);
    const totalRow = await queryAll(`SELECT COUNT(1) AS total FROM contact_applications ${where}`, currentUserId ? [currentUserId] : []);
    return { list: rows, total: totalRow[0]?.total || 0 };
  }
  async approveIncoming(ids) {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => "?").join(",");
    const sql = `UPDATE contact_applications SET status = 1 WHERE id IN (${placeholders})`;
    return sqliteRun(sql, ids);
  }
  async rejectIncoming(ids) {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => "?").join(",");
    const sql = `UPDATE contact_applications SET status = 2 WHERE id IN (${placeholders})`;
    return sqliteRun(sql, ids);
  }
  async cancelOutgoing(ids) {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => "?").join(",");
    const sql = `UPDATE contact_applications SET status = 3 WHERE id IN (${placeholders})`;
    return sqliteRun(sql, ids);
  }
  async insertApplication(applyUserId, targetId, remark) {
    const sql = `INSERT INTO contact_applications (apply_user_id, target_id, contact_type, status, apply_info, last_apply_time)
               VALUES (?, ?, 0, 0, ?, ?)`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return sqliteRun(sql, [applyUserId, targetId, remark || "", now]);
  }
}
const applicationDao = new ApplicationDao();
class ApplicationService {
  beginServe() {
    electron.ipcMain.on("application:incoming:load", async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadIncomingApplications(pageNo, pageSize);
      event.sender.send("application:incoming:loaded", data);
    });
    electron.ipcMain.on("application:outgoing:load", async (event, { pageNo, pageSize }) => {
      const data = await applicationDao.loadOutgoingApplications(pageNo, pageSize);
      event.sender.send("application:outgoing:loaded", data);
    });
    electron.ipcMain.on("application:incoming:approve", async (_event, { ids }) => {
      await applicationDao.approveIncoming(ids || []);
    });
    electron.ipcMain.on("application:incoming:reject", async (_event, { ids }) => {
      await applicationDao.rejectIncoming(ids || []);
    });
    electron.ipcMain.on("application:outgoing:cancel", async (_event, { ids }) => {
      await applicationDao.cancelOutgoing(ids || []);
    });
    electron.ipcMain.on("application:send", async (_event, { toUserId, remark }) => {
      await applicationDao.insertApplication("", toUserId, remark);
    });
  }
}
const applicationService = new ApplicationService();
class BlackDao {
  async loadBlacklist(pageNo, pageSize) {
    const offset = (pageNo - 1) * pageSize;
    const rows = await queryAll(`SELECT * FROM blacklist ORDER BY create_time DESC LIMIT ? OFFSET ?`, [pageSize, offset]);
    const totalRow = await queryAll(`SELECT COUNT(1) AS total FROM blacklist`, []);
    return { list: rows, total: totalRow[0]?.total || 0 };
  }
  async removeFromBlacklist(userIds) {
    if (!userIds.length) return 0;
    const placeholders = userIds.map(() => "?").join(",");
    const sql = `DELETE FROM blacklist WHERE target_id IN (${placeholders})`;
    return sqliteRun(sql, userIds);
  }
}
const blackDao = new BlackDao();
class BlackService {
  beginServer() {
    electron.ipcMain.on("black:list:load", async (event, { pageNo, pageSize }) => {
      const data = await blackDao.loadBlacklist(pageNo, pageSize);
      event.sender.send("black:list:loaded", data);
    });
    electron.ipcMain.on("black:list:remove", async (_event, { userIds }) => {
      await blackDao.removeFromBlacklist(userIds || []);
    });
  }
}
const blackService = new BlackService();
const getMessageId = () => {
  const time = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1e6));
  return (time << 20n | rand).toString();
};
const rawMessageToBeInserted = (data) => {
  return {
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
  };
};
class MessageDao {
  async addLocalMessage(data) {
    const changes = await insertOrIgnore("messages", rawMessageToBeInserted(data));
    if (!changes) return 0;
    const rows = await queryAll(
      "SELECT id FROM messages WHERE session_id = ? AND sequence_id = ? LIMIT 1",
      [data.sessionId, String(data.sequenceId)]
    );
    return rows[0].id;
  }
  async getMessageBySessionId(sessionId, options) {
    try {
      const limit = Number(options?.limit) || 50;
      const direction = options?.direction || "newest";
      const beforeId = options?.beforeId;
      const afterId = options?.afterId;
      let where = "WHERE session_id = ?";
      const params = [sessionId];
      if (direction === "older" && beforeId) {
        const beforeMessage = await queryAll(
          "SELECT send_time FROM messages WHERE id = ?",
          [beforeId]
        );
        if (beforeMessage.length > 0) {
          where += " AND send_time < ?";
          params.push(beforeMessage[0].sendTime);
        }
      } else if (direction === "newer" && afterId) {
        const afterMessage = await queryAll(
          "SELECT send_time FROM messages WHERE id = ?",
          [afterId]
        );
        if (afterMessage.length > 0) {
          where += " AND send_time > ?";
          params.push(afterMessage[0].sendTime);
        }
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
      const messages = rows.map((r) => {
        const extData = JSON.parse(r.extData);
        return {
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
          timestamp: new Date(r.sendTime),
          isRead: !!r.isRead,
          avatarVersion: String(extData.avatarVersion),
          nicknameVersion: String(extData.nicknameVersion)
        };
      });
      const totalCountRow = await queryAll(
        "SELECT COUNT(1) as total FROM messages WHERE session_id = ?",
        [sessionId]
      );
      const totalCount = totalCountRow[0]?.total || 0;
      let hasMore = false;
      if (messages.length > 0) {
        const lastMessage = messages.at(-1);
        const moreRow = await queryAll(
          "SELECT COUNT(1) as cnt FROM messages WHERE session_id = ? AND send_time < ?",
          [sessionId, lastMessage.timestamp.toString()]
        );
        hasMore = (moreRow[0]?.cnt || 0) > 0;
      }
      console.log("查询参数:", options, "返回消息数:", messages.length, "hasMore:", hasMore);
      return { messages, hasMore, totalCount };
    } catch (error) {
      console.error("获取会话消息失败:", error);
      return { messages: [], hasMore: false, totalCount: 0 };
    }
  }
}
const messageDao = new MessageDao();
class SessionDao {
  async selectSessions() {
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
  }
  async updateSessionByMessage(data) {
    await update("sessions", { lastMsgContent: data.content, lastMsgTime: data.sendTime }, { sessionId: data.sessionId });
  }
  async updateAvatarUrl(params) {
    try {
      const result = await update("sessions", { contactAvatar: params.avatarUrl }, { sessionId: params.sessionId });
      return result;
    } catch {
      console.error("更新会话头像失败");
      return 0;
    }
  }
}
const sessionDao = new SessionDao();
const uidKey = "newest:user:uid";
const tokenKey = "newest:user:token";
const handleMessage = async (msg, ws2) => {
  console.log(msg);
  const snap = Number(msg.adjustedTimestamp);
  const insertId = await messageDao.addLocalMessage({
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
  await sessionDao.updateSessionByMessage({ content: msg.content, sendTime: new Date(snap).toISOString(), sessionId: msg.sessionId });
  const vo = {
    id: Number(insertId) || 0,
    sessionId: msg.sessionId,
    content: String(msg.content ?? ""),
    messageType: "text",
    senderId: msg.senderId,
    senderName: msg.fromName ?? "",
    timestamp: new Date(snap),
    isRead: true,
    avatarVersion: String(msg.extra["avatarVersion"]),
    nicknameVersion: String(msg.extra["nicknameVersion"])
  };
  ws2.send(JSON.stringify({
    messageId: msg.messageId,
    type: 101,
    fromUid: store.get(uidKey)
  }));
  const session = (await queryAll("select * from sessions where session_id = ?", [msg.sessionId]))[0];
  mainWindow?.webContents.send("loadMessageDataCallback", [vo]);
  mainWindow?.webContents.send("loadSessionDataCallback", [session]);
};
let ws = null;
let maxReConnectTimes = null;
let lockReconnect = false;
let needReconnect = null;
let wsUrl = null;
const wsConfigInit = () => {
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
  const token = store.get(tokenKey);
  if (token === null) {
    console.info("token 不满足条件");
    return;
  }
  const urlWithToken = wsUrl.includes("?") ? `${wsUrl}&token=${token}` : `${wsUrl}?token=${token}`;
  ws = new WebSocket(urlWithToken);
  ws.on("open", () => {
    console.info("客户端连接成功");
    maxReConnectTimes = 20;
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
    console.info("收到消息:", data.toString());
    const msg = JSON.parse(data);
    switch (msg.messageType) {
      case 1:
        await handleMessage(msg, ws);
        break;
    }
  });
};
class MessageService {
  beginServe() {
    electron.ipcMain.handle("websocket:send", async (_, msg) => {
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
    electron.ipcMain.handle("message:get-by-sessionId", (_, sessionId, options) => {
      return messageDao.getMessageBySessionId(String(sessionId), options);
    });
  }
}
const messageService = new MessageService();
class SessionService {
  beginServe() {
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
    electron.ipcMain.handle("session:update:avatar-url", async (_, params) => {
      return await sessionDao.updateAvatarUrl(params);
    });
    electron.ipcMain.on("session:load-data", async (event) => {
      console.log("开始查询session");
      const result = await sessionDao.selectSessions();
      console.log("查询结果:", result);
      event.sender.send("session:load-data:callback", result);
    });
  }
}
const sessionService = new SessionService();
class ApiError extends Error {
  constructor(errCode, message, response) {
    super(message);
    this.errCode = errCode;
    this.message = message;
    this.response = response;
    this.name = "ApiError";
  }
}
const netMaster = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:8081",
  timeout: 10 * 1e3,
  headers: {
    "Content-Type": "application/json"
  }
});
const axiosInstance = axios.create({
  timeout: 30 * 1e3,
  // 文件上传下载超时时间更长
  headers: {
    "Content-Type": "application/octet-stream"
  }
});
netMaster.interceptors.request.use(
  (config) => {
    console.log(config);
    const token = store.get(tokenKey);
    if (token && config.headers) {
      config.headers.token = token;
    }
    return config;
  },
  (_error) => {
    return Promise.reject("请求发送失败");
  }
);
netMaster.interceptors.response.use(
  (response) => {
    const { errCode, errMsg, success } = response.data;
    if (success) {
      return response;
    } else {
      throw new ApiError(errCode, errMsg, response);
    }
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      console.log("netMaster AxiosError", error);
      const errorData = error.response.data;
      throw new ApiError(status, errorData?.errMsg || "请求失败", error.response);
    } else {
      throw new ApiError(-1, "网络连接异常");
    }
  }
);
axiosInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (_error) => {
    return Promise.reject("文件请求发送失败");
  }
);
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      console.log("netMinIO AxiosError", error);
      throw new ApiError(status, "文件操作失败", error.response);
    } else {
      throw new ApiError(-1, "文件网络连接异常");
    }
  }
);
class NetMinIO {
  axiosInstance;
  constructor(axiosInstance2) {
    this.axiosInstance = axiosInstance2;
  }
  async uploadImage(presignedUrl, imageFile) {
    const response = await this.axiosInstance.put(presignedUrl, imageFile, {
      headers: {
        "Content-Type": imageFile.type,
        "Content-Length": imageFile.size.toString()
      }
    });
    return response;
  }
  async downloadImage(imageUrl) {
    const response = await this.axiosInstance.get(imageUrl, {
      responseType: "blob",
      headers: {
        Accept: "image/*"
      }
    });
    return response.data;
  }
  async uploadAudio(presignedUrl, audioFile) {
    const response = await this.axiosInstance.put(presignedUrl, audioFile, {
      headers: {
        "Content-Type": audioFile.type,
        "Content-Length": audioFile.size.toString()
      }
    });
    return response;
  }
  async downloadAudio(audioUrl) {
    const response = await this.axiosInstance.get(audioUrl, {
      responseType: "blob",
      headers: {
        Accept: "audio/*"
      }
    });
    return response.data;
  }
  async uploadVideo(presignedUrl, videoFile) {
    const response = await this.axiosInstance.put(presignedUrl, videoFile, {
      headers: {
        "Content-Type": videoFile.type,
        "Content-Length": videoFile.size.toString()
      }
    });
    return response;
  }
  async downloadVideo(videoUrl) {
    const response = await this.axiosInstance.get(videoUrl, {
      responseType: "blob",
      headers: {
        Accept: "video/*"
      }
    });
    return response.data;
  }
  async uploadFile(presignedUrl, file) {
    const response = await this.axiosInstance.put(presignedUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": file.size.toString()
      }
    });
    return response;
  }
  async downloadFile(fileUrl, filename) {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: "blob",
      headers: {
        Accept: "*/*"
      }
    });
    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "download";
    link.click();
    window.URL.revokeObjectURL(url);
    return blob;
  }
  async downloadFileAsArrayBuffer(fileUrl, userAgent) {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: "arraybuffer",
      headers: {
        Accept: "*/*",
        "User-Agent": userAgent || "TellYou-Client/1.0"
      }
    });
    return response.data;
  }
  async downloadFileAsBlob(fileUrl, userAgent) {
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: "blob",
      headers: {
        Accept: "*/*",
        "User-Agent": userAgent || "TellYou-Client/1.0"
      }
    });
    return response.data;
  }
  async downloadAvatar(avatarUrl) {
    return this.downloadFileAsArrayBuffer(avatarUrl, "TellYou-Client/1.0");
  }
  async downloadJson(jsonUrl) {
    const response = await this.axiosInstance.get(jsonUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TellYou-Client/1.0"
      }
    });
    return response.data;
  }
  async downloadJsonAsString(jsonUrl) {
    const response = await this.axiosInstance.get(jsonUrl, {
      responseType: "text",
      headers: {
        Accept: "application/json",
        "User-Agent": "TellYou-Client/1.0"
      }
    });
    return response.data;
  }
  getAxiosInstance() {
    return this.axiosInstance;
  }
}
const netMinIO = new NetMinIO(axiosInstance);
class PullService {
  async pullStrongTransactionData() {
    console.log(`正在拉取强事务数据...`);
    try {
      await this.pullFriendContact();
      await this.pullApply();
      await this.pullGroup();
      await this.pullBlackList();
      console.log(`拉取强事务数据完成`);
    } catch (error) {
      console.error(`拉取强事务数据失败:`, error);
      throw error;
    }
  }
  // 拉取好友联系人
  async pullFriendContact() {
  }
  // 拉取申请信息
  async pullApply() {
  }
  // 拉取群组信息
  async pullGroup() {
  }
  // 拉取黑名单
  async pullBlackList() {
  }
  // 拉取离线消息
  async pullOfflineMessages() {
    try {
      console.info("开始拉取用户离线消息...", `${"http://localhost:8081"}/message/pullMailboxMessage`);
      const response = await netMaster.get(
        `${"http://localhost:8081"}/message/pullMailboxMessage`
      );
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
      const sessionUpdates = /* @__PURE__ */ new Map();
      const chatMessages = [];
      for (const message of pullResult.messageList) {
        const date = new Date(Number(message.adjustedTimestamp)).toISOString();
        console.log(message);
        const messageData = {
          sessionId: String(message.sessionId),
          sequenceId: message.sequenceNumber,
          senderId: String(message.senderId),
          messageId: message.messageId,
          senderName: "",
          msgType: message.messageType,
          text: message.content,
          extData: JSON.stringify(message.extra),
          sendTime: date,
          isRead: 0
        };
        const insertId = await messageDao.addLocalMessage(messageData);
        messageIds.push(message.messageId);
        if (insertId <= 0) continue;
        const sessionId = String(message.sessionId);
        const existingSession = sessionUpdates.get(sessionId);
        if (!existingSession || date > existingSession.sendTime) {
          sessionUpdates.set(sessionId, {
            content: message.content,
            sendTime: date
          });
        }
        chatMessages.push({
          id: insertId,
          sessionId: message.sessionId,
          content: message.content,
          messageType: "text",
          senderId: message.senderId,
          senderName: "",
          senderAvatar: "",
          timestamp: new Date(Number(message.adjustedTimestamp)),
          isRead: false
        });
      }
      const sessionUpdatePromises = [];
      for (const [sessionId, updateData] of sessionUpdates) {
        sessionUpdatePromises.push(
          sessionDao.updateSessionByMessage({
            content: updateData.content,
            sendTime: updateData.sendTime,
            sessionId
          })
        );
      }
      if (sessionUpdatePromises.length > 0) {
        try {
          await Promise.all(sessionUpdatePromises);
          console.info(`批量更新 ${sessionUpdatePromises.length} 个会话`);
        } catch (error) {
          console.error("批量更新会话失败:", error);
        }
      }
      const mainWindow = electron.BrowserWindow.getAllWindows()[0];
      if (mainWindow && chatMessages.length > 0) {
        try {
          const sessionIds = Array.from(sessionUpdates.keys());
          const sessions = await queryAll(
            `SELECT *
             FROM sessions
             WHERE session_id IN (${sessionIds.map(() => "?").join(",")})`,
            sessionIds
          );
          mainWindow.webContents.send("loadMessageDataCallback", chatMessages);
          mainWindow.webContents.send("loadSessionDataCallback", sessions);
          console.info(`发送 ${chatMessages.length} 条消息到渲染进程`);
        } catch (error) {
          console.error("发送消息到渲染进程失败:", error);
        }
      }
      if (messageIds.length > 0) {
        await this.ackConfirmMessages(messageIds);
      }
      if (pullResult.hasMore) {
        console.info("还有更多离线消息，继续拉取...");
        setTimeout(() => {
          this.pullOfflineMessages();
        }, 0);
      } else {
        console.info("离线消息拉取完成");
      }
    } catch (error) {
      console.error("拉取离线消息异常:", error);
    }
  }
  // 确认消息
  async ackConfirmMessages(messageIds) {
    try {
      console.info(`确认 ${messageIds.length} 条消息`, messageIds);
      const requestData = {
        messageIdList: messageIds
      };
      const response = await netMaster.post(
        `${"http://localhost:8081"}/message/ackConfirm`,
        requestData
      );
      if (response.data.success) {
        console.info("消息确认成功");
      } else {
        console.error("消息确认失败:", response.data.errMsg);
      }
    } catch (error) {
      console.error("消息确认异常:", error);
    }
  }
}
const pullService = new PullService();
const initializeUserData = async (uid) => {
  connectWs();
  urlUtil.redirectSqlPath(uid);
  if (!redirectDataBase()) {
    console.info("未检测到本地数据，新创建数据库");
  }
  await initTable();
  await pullService.pullStrongTransactionData();
  await pullService.pullOfflineMessages();
};
const NON_COMPRESSIBLE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "text/plain",
  "application/json",
  "application/xml"
];
const MOTION_IMAGE_TYPES = ["image/gif", "image/webp", "image/avif"];
const IM_COMPRESSION_CONFIG = {
  thumbnail: {
    format: "avif",
    maxSize: 300,
    quality: 80,
    crf: 35,
    cpuUsed: 4
  },
  original: {
    maxSize: 1920,
    quality: 90,
    progressive: true,
    crf: 25,
    cpuUsed: 2
  }
};
class MediaUtil {
  maxVideoSize = 1280;
  thumbnailSize = 300;
  previewSize = 800;
  suffixMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif"
  };
  mimeTypeMap = {
    ".json": "application/json",
    ".jpg": "image/jpg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mpeg": "audio/mpeg",
    ".wav": "audio/wav"
  };
  /**
   * 检查文件是否需要压缩
   */
  needsCompression(mimeType) {
    return !NON_COMPRESSIBLE_TYPES.includes(mimeType);
  }
  /**
   * 检查是否为动图
   */
  isMotionImage(mimeType) {
    return MOTION_IMAGE_TYPES.includes(mimeType);
  }
  /**
   * 获取文件后缀
   */
  getSuffixByMimeType(mimeType) {
    return this.suffixMap[mimeType] || ".jpg";
  }
  /**
   * 获取上传格式
   */
  getMimeTypeBySuffix(suffix) {
    return this.mimeTypeMap[suffix] || "application/octet-stream";
  }
  /**
   * 获取标准参数
   */
  async getNormal(filePath) {
    try {
      const buffer = await fs.promises.readFile(filePath);
      console.info(buffer.length);
      return { buffer, size: buffer.length, originalName: path.basename(filePath), mimeType: this.getMimeTypeBySuffix(path.extname(filePath)) };
    } catch (e) {
      console.error("获取文件失败");
      throw e;
    }
  }
  async processImage(mediaFile, strategy) {
    const { mimeType } = mediaFile;
    if (this.isMotionImage(mimeType)) {
      return this.processMotion(mediaFile, strategy);
    } else {
      if (strategy === "thumb") {
        return this.processStaticThumbnail(mediaFile);
      } else {
        return this.processStaticOriginal(mediaFile);
      }
    }
  }
  /**
   * 处理动图
   */
  async processMotion(mediaFile, strategy) {
    const { buffer } = mediaFile;
    try {
      const tempInputPath = path.join(
        urlUtil.tempPath,
        `motion_input_${Date.now()}.${mediaFile.mimeType.split("/")[1]}`
      );
      const tempOutputPath = path.join(urlUtil.tempPath, `motion_thumb_${Date.now()}.avif`);
      console.info("临时目录", urlUtil.tempPath);
      await fs.promises.mkdir(path.dirname(tempInputPath), { recursive: true });
      await fs.promises.writeFile(tempInputPath, buffer);
      const currentConfig = strategy === "thumb" ? IM_COMPRESSION_CONFIG.thumbnail : IM_COMPRESSION_CONFIG.original;
      const compressedBuffer = await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath).size(`${currentConfig.maxSize}x?`).outputOptions([
          "-c:v libaom-av1",
          "-b:v 0",
          `-crf ${currentConfig.crf}`,
          `-cpu-used 8`,
          "-threads 0",
          "-pix_fmt yuv420p",
          "-movflags +faststart",
          "-vsync cfr",
          "-f avif"
        ]).on("end", async () => {
          try {
            const compressedData = await fs.promises.readFile(tempOutputPath);
            resolve(compressedData);
          } catch (error) {
            reject(error);
          }
        }).on("error", (err) => {
          console.error("FFmpeg 错误详情:", err.message);
          reject(err);
        }).save(tempOutputPath);
      });
      await fs.promises.unlink(tempInputPath).catch(() => {
      });
      await fs.promises.unlink(tempOutputPath).catch(() => {
      });
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100;
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "image/avif",
        newSuffix: ".avif"
      };
    } catch (error) {
      throw new Error(`动图缩略图转码失败: ${error.message}`);
    }
  }
  /**
   * 处理静态图片缩略图
   */
  async processStaticThumbnail(mediaFile) {
    const { buffer } = mediaFile;
    const config = IM_COMPRESSION_CONFIG.thumbnail;
    try {
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      const { width = 0, height = 0 } = metadata;
      const { newWidth, newHeight } = this.calculateDimensions(width, height, config.maxSize);
      const compressedBuffer = await sharpInstance.resize(newWidth, newHeight, { fit: "cover" }).avif({ quality: config.quality }).toBuffer();
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100;
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "image/avif",
        newSuffix: ".avif"
      };
    } catch (error) {
      throw new Error(`静态图片缩略图生成失败: ${error.message}`);
    }
  }
  /**
   * 处理静态图片原图
   */
  async processStaticOriginal(mediaFile) {
    const { buffer, mimeType } = mediaFile;
    const config = IM_COMPRESSION_CONFIG.original;
    try {
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();
      const { width = 0, height = 0 } = metadata;
      const { newWidth, newHeight } = this.calculateDimensions(width, height, config.maxSize);
      let compressedBuffer;
      let newMimeType = mimeType;
      if (mimeType === "image/png") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, { fit: "inside", withoutEnlargement: true }).webp({ quality: config.quality }).toBuffer();
        newMimeType = "image/webp";
      } else if (mimeType === "image/jpeg") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: config.quality, progressive: config.progressive }).toBuffer();
      } else if (mimeType == "image/avif") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, { fit: "inside", withoutEnlargement: true }).avif({ quality: config.quality, progressive: config.progressive }).toBuffer();
        newMimeType = "image/avif";
      } else {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: config.quality, progressive: config.progressive }).toBuffer();
        newMimeType = "image/jpeg";
      }
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100;
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType,
        newSuffix: this.getSuffixByMimeType(newMimeType)
      };
    } catch (error) {
      throw new Error(`静态图片原图处理失败: ${error.message}`);
    }
  }
  /**
   * 压缩视频
   */
  async compressVideo(mediaFile) {
    const { buffer } = mediaFile;
    try {
      const tempInputPath = path.join(process.cwd(), "temp", `input_${Date.now()}.mp4`);
      const tempOutputPath = path.join(process.cwd(), "temp", `output_${Date.now()}.mp4`);
      await fs.promises.mkdir(path.dirname(tempInputPath), { recursive: true });
      await fs.promises.writeFile(tempInputPath, buffer);
      const compressedBuffer = await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath).size(`${this.maxVideoSize}x?`).videoBitrate("1000k").audioBitrate("128k").format("mp4").outputOptions([
          "-c:v libx264",
          // 使用更高效的 H.264 编码器
          "-crf 23",
          // 降低 CRF 值，提高压缩率
          "-preset fast",
          // 平衡速度和质量
          "-threads 0",
          "-movflags +faststart"
        ]).on("end", async () => {
          try {
            const compressedData = await fs.promises.readFile(tempOutputPath);
            resolve(compressedData);
          } catch (error) {
            reject(error);
          }
        }).on("error", reject).save(tempOutputPath);
      });
      await fs.promises.unlink(tempInputPath).catch(() => {
      });
      await fs.promises.unlink(tempOutputPath).catch(() => {
      });
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100;
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "video/mp4",
        newSuffix: ".mp4"
      };
    } catch (error) {
      throw new Error(`视频压缩失败: ${error.message}`);
    }
  }
  /**
   * 压缩音频
   */
  async compressAudio(mediaFile) {
    const { buffer } = mediaFile;
    try {
      const tempInputPath = path.join(process.cwd(), "temp", `input_${Date.now()}.mp3`);
      const tempOutputPath = path.join(process.cwd(), "temp", `output_${Date.now()}.mp3`);
      await fs.promises.mkdir(path.dirname(tempInputPath), { recursive: true });
      await fs.promises.writeFile(tempInputPath, buffer);
      const compressedBuffer = await new Promise((resolve, reject) => {
        ffmpeg(tempInputPath).audioBitrate("128k").format("mp3").on("end", async () => {
          try {
            const compressedData = await fs.promises.readFile(tempOutputPath);
            resolve(compressedData);
          } catch (error) {
            reject(error);
          }
        }).on("error", reject).save(tempOutputPath);
      });
      await fs.promises.unlink(tempInputPath).catch(() => {
      });
      await fs.promises.unlink(tempOutputPath).catch(() => {
      });
      const compressionRatio = (1 - compressedBuffer.length / buffer.length) * 100;
      return {
        compressedBuffer,
        compressedSize: compressedBuffer.length,
        compressionRatio,
        newMimeType: "audio/mp3",
        newSuffix: ".mp3"
      };
    } catch (error) {
      throw new Error(`音频压缩失败: ${error.message}`);
    }
  }
  /**
   * 生成视频缩略图
   */
  async generateVideoThumbnail(mediaFile) {
    const { buffer } = mediaFile;
    try {
      const tempVideoPath = path.join(process.cwd(), "temp", `video_${Date.now()}.mp4`);
      const tempThumbnailPath = path.join(process.cwd(), "temp", `thumb_${Date.now()}.jpg`);
      await fs.promises.mkdir(path.dirname(tempVideoPath), { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);
      const snap = Math.floor(Math.random() * 100);
      const thumbnailBuffer = await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath).screenshots({
          timestamps: [`${snap}%`],
          filename: path.basename(tempThumbnailPath),
          folder: path.dirname(tempThumbnailPath),
          size: `${this.thumbnailSize}x?`
        }).on("end", async () => {
          try {
            const thumbnailData = await fs.promises.readFile(tempThumbnailPath);
            resolve(thumbnailData);
          } catch (error) {
            reject(error);
          }
        }).on("error", reject);
      });
      await fs.promises.unlink(tempVideoPath).catch(() => {
      });
      await fs.promises.unlink(tempThumbnailPath).catch(() => {
      });
      return {
        thumbnailBuffer,
        thumbnailSize: thumbnailBuffer.length,
        dimensions: { width: this.thumbnailSize, height: this.thumbnailSize }
      };
    } catch (error) {
      throw new Error(`视频缩略图生成失败: ${error.message}`);
    }
  }
  /**
   * 生成预览图
   */
  async generatePreview(mediaFile) {
    const { mimeType } = mediaFile;
    if (mimeType.startsWith("video/")) {
      return this.generateVideoPreview(mediaFile);
    } else {
      throw new Error(`不支持的预览图类型: ${mimeType}`);
    }
  }
  /**
   * 生成视频预览图
   */
  async generateVideoPreview(mediaFile) {
    const { buffer } = mediaFile;
    try {
      const tempVideoPath = path.join(process.cwd(), "temp", `video_${Date.now()}.mp4`);
      const tempPreviewPath = path.join(process.cwd(), "temp", `preview_${Date.now()}.jpg`);
      await fs.promises.mkdir(path.dirname(tempVideoPath), { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);
      const snap = Math.floor(Math.random() * 100);
      const previewBuffer = await new Promise((resolve, reject) => {
        ffmpeg(tempVideoPath).screenshots({
          timestamps: [`${snap}%`],
          filename: path.basename(tempPreviewPath),
          folder: path.dirname(tempPreviewPath),
          size: `${this.previewSize}x?`
        }).on("end", async () => {
          try {
            const previewData = await fs.promises.readFile(tempPreviewPath);
            resolve(previewData);
          } catch (error) {
            reject(error);
          }
        }).on("error", reject);
      });
      await fs.promises.unlink(tempVideoPath).catch(() => {
      });
      await fs.promises.unlink(tempPreviewPath).catch(() => {
      });
      return {
        thumbnailBuffer: previewBuffer,
        thumbnailSize: previewBuffer.length,
        dimensions: { width: this.previewSize, height: this.previewSize }
      };
    } catch (error) {
      throw new Error(`视频预览图生成失败: ${error.message}`);
    }
  }
  /**
   * 获取视频信息
   */
  async getVideoInfo(mediaFile) {
    const { buffer } = mediaFile;
    try {
      const tempVideoPath = path.join(process.cwd(), "temp", `video_${Date.now()}.mp4`);
      await fs.promises.mkdir(path.dirname(tempVideoPath), { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          const videoStream = metadata.streams.find((stream) => stream.codec_type === "video");
          if (!videoStream) {
            reject(new Error("未找到视频流"));
            return;
          }
          resolve({
            duration: metadata.format.duration || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            bitrate: parseInt(String(metadata.format.bit_rate || "0")),
            codec: videoStream.codec_name || "unknown"
          });
        });
      });
      await fs.promises.unlink(tempVideoPath).catch(() => {
      });
      return videoInfo;
    } catch (error) {
      throw new Error(`获取视频信息失败: ${error.message}`);
    }
  }
  /**
   * 计算压缩尺寸
   */
  calculateDimensions(originalWidth, originalHeight, maxSize) {
    if (originalWidth <= maxSize && originalHeight <= maxSize) {
      return { newWidth: originalWidth, newHeight: originalHeight };
    }
    const ratio = Math.min(maxSize / originalWidth, maxSize / originalHeight);
    return {
      newWidth: Math.round(originalWidth * ratio),
      newHeight: Math.round(originalHeight * ratio)
    };
  }
}
const mediaUtil = new MediaUtil();
const test = async () => {
  const inputPath = "D:/multi-media-material/a6d41f7da42d4c70a98b0b830a2eb968~tplv-p14lwwcsbr-7.jpg";
  const outPutPath = "D:/multi-media-material/compress/out12.jpg";
  return mediaUtil.getNormal(inputPath).then(async (mediaFile) => {
    return mediaUtil.processStaticOriginal(mediaFile);
  }).then(async (result) => {
    console.info(result);
    await fs.promises.writeFile(outPutPath, result.compressedBuffer);
    console.info("压缩 jpg 文件任务完成");
  });
};
class DeviceService {
  loginWidth = 596;
  loginHeight = 400;
  registerWidth = 596;
  registerHeight = 462;
  beginServe(mainWindow) {
    electron.ipcMain.on("LoginOrRegister", (_, isLogin) => {
      mainWindow.setResizable(true);
      if (isLogin === false) {
        mainWindow.setSize(this.loginWidth, this.loginHeight);
      } else {
        mainWindow.setSize(this.registerWidth, this.registerHeight);
      }
      mainWindow.setResizable(false);
    });
    electron.ipcMain.on("LoginSuccess", (_, uid) => {
      wsConfigInit();
      mainWindow.setResizable(true);
      mainWindow.setSize(920, 740);
      mainWindow.setMaximizable(true);
      mainWindow.setMinimumSize(800, 600);
      mainWindow.center();
      initializeUserData(uid);
    });
    electron.ipcMain.on("window-ChangeScreen", (event, status) => {
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
    electron.ipcMain.handle("test", (_) => {
      test();
    });
  }
}
const deviceService = new DeviceService();
class AvatarCacheService {
  cacheMap = /* @__PURE__ */ new Map();
  maxCacheSize = 100 * 1024 * 1024;
  // 100MB
  maxCacheAge = 7 * 24 * 60 * 60 * 1e3;
  // 7 days
  maxFiles = 1e3;
  getJsonPath = (userId) => path.join(urlUtil.cachePaths["avatar"], userId, "index.json");
  // {userData}/cache/avatar/{userId}/index.json
  beginServe() {
    this.startCleanupTimer();
    electron.ipcMain.handle("avatar:cache:seek-by-version", async (_, params) => {
      let item = this.cacheMap.get(params.userId);
      if (item && this.checkVersion(item, params.strategy, params.version) && fs.existsSync(item[params.strategy].localPath)) {
        return { success: true, pathResult: urlUtil.signByApp(item[params.strategy].localPath) };
      } else if (fs.existsSync(this.getJsonPath(params.userId))) {
        try {
          item = JSON.parse(fs.readFileSync(this.getJsonPath(params.userId), "utf-8"));
          console.info("avatar:cache:seek-by-version: ", item);
          if (item && this.checkVersion(item, params.strategy, params.version) && fs.existsSync(item[params.strategy].localPath)) {
            this.cacheMap.set(params.userId, item);
            return { success: true, pathResult: urlUtil.signByApp(item[params.strategy].localPath) };
          }
        } catch (error) {
          console.error(error);
        }
      }
      console.info("debug:downloadJson:  ", [urlUtil.atomPath, params.userId + ".json"].join("/"));
      const result = await netMinIO.downloadJson([urlUtil.atomPath, params.userId + ".json"].join("/"));
      return { success: false, pathResult: result[params.strategy] };
    });
    electron.ipcMain.handle("avatar:get", async (_, { userId, strategy, avatarUrl }) => {
      try {
        const filePath = await this.getAvatarPath(userId, strategy, avatarUrl);
        if (!filePath) return null;
        return urlUtil.signByApp(filePath);
      } catch (error) {
        console.error("Failed to get avatar:", error);
        return null;
      }
    });
  }
  checkVersion(item, strategy, version) {
    return item[strategy] && item[strategy].version >= version;
  }
  extractVersionFromUrl(url) {
    return new URL(url).pathname.split("/").at(-2) || "";
  }
  extractObjectFromUrl(url) {
    return new URL(url).pathname.split("/").at(-1) || "";
  }
  saveItem(userId, cacheItem) {
    try {
      fs.writeFileSync(this.getJsonPath(userId), JSON.stringify(cacheItem, null, 2));
    } catch (error) {
      log.error("Failed to save cache index:", error);
    }
  }
  async getAvatarPath(userId, strategy, avatarUrl) {
    try {
      const filePath = path.join(urlUtil.cachePaths["avatar"], userId, strategy, this.extractObjectFromUrl(avatarUrl));
      urlUtil.ensureDir(path.join(urlUtil.cachePaths["avatar"], userId, strategy));
      console.info("debug:downloadAvatar:  ", [userId, avatarUrl, filePath].join(" !!! "));
      const success = await this.downloadAvatar(avatarUrl, filePath);
      if (success) {
        this.updateCacheIndex(userId, strategy, this.extractVersionFromUrl(avatarUrl), filePath);
        return filePath;
      }
      return null;
    } catch (error) {
      log.error("Failed to download and cache avatar:", error);
      return null;
    }
  }
  async downloadAvatar(url, filePath) {
    try {
      const arrayBuffer = await netMinIO.downloadAvatar(url);
      if (arrayBuffer) {
        console.info("下载成功", url);
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        return true;
      }
      return false;
    } catch (error) {
      log.error("Failed to download avatar:", url, error);
      return false;
    }
  }
  updateCacheIndex(userId, strategy, version, filePath) {
    let item = this.cacheMap.get(userId);
    if (item) {
      item[strategy] = { version, localPath: filePath };
    } else {
      item = {
        [strategy]: { version, localPath: filePath }
      };
    }
    this.cacheMap.set(userId, item);
    this.saveItem(userId, item);
  }
  cleanupOldCache() {
  }
  startCleanupTimer() {
    setInterval(
      () => {
        this.cleanupOldCache();
      },
      60 * 60 * 1e3
    );
  }
}
const avatarCacheService = new AvatarCacheService();
class ProxyService {
  beginServe() {
    electron.ipcMain.handle("proxy:login", async (_event, params) => {
      const response = await netMaster.post("/user-account/login", params);
      return response.data.data;
    });
    electron.ipcMain.handle(
      "proxy:register",
      async (_event, params) => {
        const response = await netMaster.post("/user-account/register", params);
        return response.data;
      }
    );
  }
}
const proxyService = new ProxyService();
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
electron.app.setPath("userData", electron.app.getPath("userData") + "_" + urlUtil.instanceId);
electron.protocol.registerSchemesAsPrivileged([{
  scheme: "tellyou",
  privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, bypassCSP: true }
}]);
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
electron.app.whenReady().then(() => {
  console.info("TellYou应用启动", {
    version: electron.app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeEnv: process.env.NODE_ENV
  });
  urlUtil.init();
  urlUtil.registerProtocol();
  utils.electronApp.setAppUserModelId("com.electron");
  electron.app.on("browser-window-created", (_, window2) => {
    utils.optimizer.watchWindowShortcuts(window2);
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
const createWindow = () => {
  const mainWindow = new electron.BrowserWindow({
    icon,
    width: deviceService.loginWidth,
    height: deviceService.loginHeight,
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
      contextIsolation: true,
      experimentalFeatures: true
    }
  });
  const tray = new electron.Tray(icon);
  tray.setTitle("TellYou");
  tray.setContextMenu(menu);
  tray.on("click", () => {
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
  });
  proxyService.beginServe();
  avatarCacheService.beginServe();
  mediaTaskService.beginServe();
  jsonStoreService.beginServe();
  sessionService.beginServe();
  messageService.beginServe();
  applicationService.beginServe();
  blackService.beginServer();
  deviceService.beginServe(mainWindow);
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
  if (utils.is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["default-src * 'unsafe-eval' 'unsafe-inline' data: blob: file:"]
        }
      });
    });
  }
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};
exports.netMaster = netMaster;
exports.netMinIO = netMinIO;
exports.store = store;
