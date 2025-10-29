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
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const sharp = require("sharp");
const axios = require("axios");
const sqlite3 = require("sqlite3");
const WebSocket = require("ws");
const icon = path.join(__dirname, "./chunks/icon-Mz5fn9fh.png");
class UrlUtil {
  protocolHost = [
    "avatar",
    "picture",
    "voice",
    "video",
    "file"
  ];
  mimeByExt = {
    // 图片格式
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    // 音频格式
    ".webm": "audio/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    // 视频格式
    ".mp4": "video/mp4",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".flv": "video/x-flv",
    ".mkv": "video/x-matroska",
    // 其他格式
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".json": "application/json",
    ".xml": "application/xml"
  };
  nodeEnv = process.env.NODE_ENV || "production";
  homeDir = os.homedir();
  appPath = path.join(
    this.homeDir,
    this.nodeEnv === "development" ? ".tellyoudev" : ".tellyou"
  );
  tempPath = path.join(this.appPath, "temp");
  sqlPath = this.appPath;
  atomPath = "http://113.44.158.255:32788/lanye/static";
  instanceId = process.env.ELECTRON_INSTANCE_ID || "";
  cacheRootPath = "";
  cachePaths = {
    avatar: "",
    picture: "",
    voice: "",
    video: "",
    file: ""
  };
  // 保证目录存在
  ensureDir(path2) {
    if (!fs.existsSync(path2)) {
      console.info("url-util:ensure-dir:", path2);
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
  // 注册本地文件访问协议
  registerProtocol() {
    electron.protocol.handle("tellyou", async (request) => {
      try {
        const url = new URL(request.url);
        if (!this.protocolHost.includes(url.hostname))
          return new Response("", { status: 403 });
        const filePath = decodeURIComponent(url.searchParams.get("path") || "");
        const normalized = path.resolve(filePath);
        const ext = path.extname(normalized).toLowerCase();
        const mime = this.mimeByExt[ext] || "application/octet-stream";
        const data = await fs.promises.readFile(normalized);
        return new Response(data, {
          headers: { "content-type": mime, "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        console.error("tellyou protocol error:", e);
        return new Response("", { status: 500 });
      }
    });
  }
  // 资源定位符：重定向数据库目录
  redirectSqlPath(userId) {
    this.sqlPath = path.join(this.appPath, "_" + userId);
    console.info("数据库操作目录 " + this.sqlPath);
    if (!fs.existsSync(this.sqlPath)) {
      fs.mkdirSync(this.sqlPath, { recursive: true });
    }
  }
  //  文件自定义协议签名
  signByApp(host, path2) {
    return `tellyou://${host}?path=${encodeURIComponent(path2)}`;
  }
  // 从 URL 中提取对象名称
  extractObjectName(url) {
    return new URL(url).pathname.split("/").slice(2).join("/");
  }
  // /lanye/avatar/original/1948031012053333361/6/index.png -> avatar/original/1948031012053333361/6/index.png
  // 从 URL 中提取扩展名
  extractExt(url) {
    return path.extname(url);
  }
  // 检查文件是否存在
  existLocalFile(url) {
    const normalized = path.resolve(url);
    return fs.existsSync(normalized);
  }
  // 确保今天目录存在
  ensureTodayDir(host) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayPath = path.join(this.cachePaths[host], today);
    this.ensureDir(todayPath);
    return todayPath;
  }
}
const urlUtil = new UrlUtil();
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
    crf: 63,
    cpuUsed: 4
  },
  original: {
    maxSize: 1920,
    quality: 90,
    progressive: true,
    crf: 50,
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
      return {
        buffer,
        size: buffer.length,
        originalName: path.basename(filePath),
        mimeType: this.getMimeTypeBySuffix(path.extname(filePath))
      };
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
      const tempOutputPath = path.join(
        urlUtil.tempPath,
        `motion_thumb_${Date.now()}.avif`
      );
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
      const { newWidth, newHeight } = this.calculateDimensions(
        width,
        height,
        config.maxSize
      );
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
      const { newWidth, newHeight } = this.calculateDimensions(
        width,
        height,
        config.maxSize
      );
      let compressedBuffer;
      let newMimeType = mimeType;
      if (mimeType === "image/png") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true
        }).webp({ quality: config.quality }).toBuffer();
        newMimeType = "image/webp";
      } else if (mimeType === "image/jpeg") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true
        }).jpeg({ quality: config.quality, progressive: config.progressive }).toBuffer();
      } else if (mimeType == "image/avif") {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true
        }).avif({ quality: config.quality }).toBuffer();
        newMimeType = "image/avif";
      } else {
        compressedBuffer = await sharpInstance.resize(newWidth, newHeight, {
          fit: "inside",
          withoutEnlargement: true
        }).jpeg({ quality: config.quality, progressive: config.progressive }).toBuffer();
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
      const tempInputPath = path.join(
        process.cwd(),
        "temp",
        `input_${Date.now()}.mp4`
      );
      const tempOutputPath = path.join(
        process.cwd(),
        "temp",
        `output_${Date.now()}.mp4`
      );
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
      const tempInputPath = path.join(
        process.cwd(),
        "temp",
        `input_${Date.now()}.mp3`
      );
      const tempOutputPath = path.join(
        process.cwd(),
        "temp",
        `output_${Date.now()}.mp3`
      );
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
      const tempVideoPath = path.join(
        process.cwd(),
        "temp",
        `video_${Date.now()}.mp4`
      );
      const tempThumbnailPath = path.join(
        process.cwd(),
        "temp",
        `thumb_${Date.now()}.jpg`
      );
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
      const tempVideoPath = path.join(
        process.cwd(),
        "temp",
        `video_${Date.now()}.mp4`
      );
      const tempPreviewPath = path.join(
        process.cwd(),
        "temp",
        `preview_${Date.now()}.jpg`
      );
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
      const tempVideoPath = path.join(
        process.cwd(),
        "temp",
        `video_${Date.now()}.mp4`
      );
      await fs.promises.mkdir(path.dirname(tempVideoPath), { recursive: true });
      await fs.promises.writeFile(tempVideoPath, buffer);
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }
          const videoStream = metadata.streams.find(
            (stream) => stream.codec_type === "video"
          );
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
const uidKey = "newest:user:uid";
const tokenKey = "newest:user:token";
class ObjectUtil {
  getContentByMessage(msg) {
    if (msg.messageType === "text") return msg.content || "";
    if (msg.messageType === "image") return "[图片]";
    if (msg.messageType === "voice") return "[语音]";
    if (msg.messageType === "video") return "[视频]";
    if (msg.messageType === "file") return "[文件]";
    return "未知";
  }
  getContentByRow(msg) {
    if (msg.msgType === 1) return msg.text || "";
    if (msg.msgType === 2) return "[图片]";
    if (msg.msgType === 3) return "[语音]";
    if (msg.msgType === 4) return "[视频]";
    if (msg.msgType === 5) return "[文件]";
    return "未知";
  }
  errorResponse(e) {
    if (e?.name === "ApiError") {
      return {
        success: false,
        errCode: e.errCode ?? -1,
        errMsg: e.errMsg ?? "请求失败"
      };
    }
    return {
      success: false,
      errCode: -1,
      errMsg: e?.message || "网络或系统异常"
    };
  }
}
const objectUtil = new ObjectUtil();
var Api = /* @__PURE__ */ ((Api2) => {
  Api2["LOGIN"] = "/user-account/login";
  Api2["REGISTER"] = "/user-account/register";
  Api2["PULL_MAILBOX"] = "/message/pull-mailbox";
  Api2["ACK_CONFIRM"] = "/message/ack-confirm";
  Api2["SEARCH_USER"] = "/user-info/search-by-uid";
  Api2["GET_AVATAR_UPLOAD_URL"] = "/media/user-avatar/upload-url";
  Api2["CONFIRM_UPLOAD"] = "/media/user-avatar/upload-confirm";
  Api2["PULL_CONTACT"] = "/contact/pull-contact";
  Api2["PULL_APPLICATION"] = "/contact/cursor-pull-application";
  Api2["GET_BASE_USER"] = "/user-info/base-info-list";
  Api2["GET_BASE_GROUP"] = "/group/base-info-list";
  Api2["CREATE_GROUP"] = "/group/create-group";
  Api2["INVITE_FRIEND"] = "/group/invite-friend";
  Api2["DISSOLVE_GROUP"] = "/group/dissolve-group";
  Api2["LEAVE_GROUP"] = "/group/leave-group";
  Api2["SEND_GROUP_APPLY"] = "/group/send-apply";
  Api2["ACCEPT_GROUP_APPLY"] = "/group/accept-apply";
  Api2["KICK_OUT_MEMBER"] = "/group/kick-out-member";
  Api2["MODIFY_GROUP_NAME"] = "/group/modify-group-name";
  Api2["MODIFY_GROUP_CARD"] = "/group/modify-group-card";
  Api2["TRANSFER_OWNER"] = "/group/transfer-owner";
  Api2["ADD_MANAGER"] = "/group/add-manager";
  Api2["WITHDRAW_MANAGER"] = "/group/withdraw-manager";
  Api2["GET_MEMBER_LIST"] = "/group/get-member-list";
  Api2["SEND_FRIEND_APPLY"] = "/contact/friend-send-apply";
  Api2["ACCEPT_FRIEND_APPLY"] = "/contact/friend-accept-apply";
  Api2["GET_PICTURE_UPLOAD_URL"] = "/media/picture/upload-url";
  Api2["GET_VOICE_UPLOAD_URL"] = "/media/voice/upload-url";
  Api2["GET_VIDEO_UPLOAD_URL"] = "/media/video/upload-url";
  Api2["GET_FILE_UPLOAD_URL"] = "/media/file/upload-url";
  Api2["CONFIRM_PICTURE_UPLOAD"] = "/media/picture/upload-confirm";
  Api2["CONFIRM_VOICE_UPLOAD"] = "/media/voice/upload-confirm";
  Api2["CONFIRM_VIDEO_UPLOAD"] = "/media/video/upload-confirm";
  Api2["CONFIRM_FILE_UPLOAD"] = "/media/file/upload-confirm";
  return Api2;
})(Api || {});
class ProxyService {
  beginServe() {
    electron.ipcMain.handle(
      "proxy:login",
      async (_event, params) => {
        const response = await netMaster.post("/user-account/login", params);
        return response.data.data;
      }
    );
    electron.ipcMain.handle(
      "proxy:register",
      async (_event, params) => {
        const data = { code: "123456" };
        Object.assign(data, params);
        try {
          const response = await netMaster.post("/user-account/register", data);
          return response.data;
        } catch (e) {
          return objectUtil.errorResponse(e);
        }
      }
    );
    electron.ipcMain.handle(
      "proxy:search:user-or-group",
      async (_, params) => {
        if (params.contactType === 1) {
          const result = await netMaster.post("/user-info/search-by-uid", {
            fromId: store.get(uidKey),
            searchedId: params.contactId
          });
          return result.data.data;
        }
        return null;
      }
    );
    electron.ipcMain.handle(
      "proxy:application:send-user",
      async (_, params) => {
        Object.assign(params, { fromUserId: store.get(uidKey) });
        try {
          const response = await netMaster.post("/contact/friend-send-apply", params);
          return response.data;
        } catch (e) {
          return objectUtil.errorResponse(e);
        }
      }
    );
    electron.ipcMain.handle("proxy:application:accept-friend-apply", async (_, applyId) => {
      const payload = { fromUserId: store.get(uidKey), applyId };
      try {
        const response = await netMaster.put("/contact/friend-accept-apply", payload);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:application:send-group-apply", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.post("/group/send-apply", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:application:accept-group-member-apply", async (_, params) => {
      return null;
    });
    electron.ipcMain.handle("proxy:group:create-group", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.post("/group/create-group", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:invite-friend", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.post("/group/invite-friend", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:dissolve-group", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.delete("/group/dissolve-group", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:leave-group", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.delete("/group/leave-group", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:kick-out-member", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.delete("/group/kick-out-member", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:modify-group-name", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.put("/group/modify-group-name", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:modify-group-card", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.put("/group/modify-group-card", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:transfer-owner", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.put("/group/transfer-owner", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:add-manager", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.put("/group/add-manager", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:withdraw-manager", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.put("/group/withdraw-manager", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
    electron.ipcMain.handle("proxy:group:get-member-list", async (_, params) => {
      Object.assign(params, { fromUserId: store.get(uidKey) });
      try {
        const response = await netMaster.get("/group/get-member-list", params);
        return response.data;
      } catch (e) {
        return objectUtil.errorResponse(e);
      }
    });
  }
}
const proxyService = new ProxyService();
class ApiError extends Error {
  constructor(errCode, message, response) {
    super(message);
    this.errCode = errCode;
    this.message = message;
    this.response = response;
    this.response = response;
    this.errCode = errCode;
    this.errMsg = message;
    this.name = "ApiError";
  }
  errMsg;
}
const masterInstance = axios.create({
  withCredentials: true,
  baseURL: "http://localhost:8081",
  timeout: 180 * 1e3,
  headers: {
    "Content-Type": "application/json"
  }
});
const minioInstance = axios.create({
  timeout: 30 * 1e3
  // 文件上传下载超时时间更长
  // 不设置默认 Content-Type，让每个请求自己指定
});
class NetMaster {
  axiosInstance;
  constructor(axiosInstance) {
    this.axiosInstance = axiosInstance;
    this.setupInterceptors();
  }
  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
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
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const { errCode, errMsg, success } = response.data;
        if (success) {
          return response;
        } else {
          console.log("not-success: ", response);
          throw new ApiError(errCode, errMsg, response);
        }
      },
      (error) => {
        if (error.response) {
          const status = error.response.status;
          console.error("netMaster AxiosError:失败:", error.response);
          const data = error.response.data;
          if (data && typeof data.errMsg === "string") {
            throw new ApiError(data.errCode || -1, data.errMsg, error.response);
          }
          let msg = "请求失败";
          switch (status) {
            case 400:
              msg = "请求参数错误";
              break;
            case 401:
              msg = "未授权，请重新登录";
              break;
            case 403:
              msg = "权限不足";
              break;
            case 404:
              msg = "请求的资源不存在";
              break;
            case 500:
              msg = "服务器内部错误";
              break;
          }
          throw new ApiError(status, msg, error.response);
        } else {
          throw new ApiError(-1, "网络连接异常");
        }
      }
    );
  }
  async get(url, config) {
    return this.axiosInstance.get(url, config);
  }
  async post(url, data, config) {
    return this.axiosInstance.post(url, data, config);
  }
  async put(url, data, config) {
    return this.axiosInstance.put(url, data, config);
  }
  async delete(url, config) {
    return this.axiosInstance.delete(url, config);
  }
  async patch(url, data, config) {
    return this.axiosInstance.patch(url, data, config);
  }
  getAxiosInstance() {
    return this.axiosInstance;
  }
  async getUserAvatarUploadUrl(fileSize, fileSuffix) {
    const response = await this.get(Api.GET_AVATAR_UPLOAD_URL, {
      params: { fileSize, fileSuffix }
    });
    return response.data.data;
  }
  async confirmUserAvatarUploaded(uploadUrls) {
    return this.post(Api.CONFIRM_UPLOAD, {
      fromUserId: store.get(uidKey),
      originalUploadUrl: urlUtil.extractObjectName(
        uploadUrls.originalUploadUrl
      ),
      thumbnailUploadUrl: urlUtil.extractObjectName(
        uploadUrls.thumbnailUploadUrl
      )
    });
  }
  // 图片上传预签名URL获取
  async getPictureUploadUrl(params) {
    const response = await this.get(Api.GET_PICTURE_UPLOAD_URL, { params });
    return response.data.data;
  }
  // 语音上传预签名URL获取
  async getVoiceUploadUrl(params) {
    const response = await this.get(Api.GET_VOICE_UPLOAD_URL, { params });
    return response.data.data;
  }
  // 视频上传预签名URL获取
  async getVideoUploadUrl(params) {
    const response = await this.get(Api.GET_VIDEO_UPLOAD_URL, { params });
    return response.data.data;
  }
  // 文件上传预签名URL获取
  async getFileUploadUrl(params) {
    const response = await this.get(Api.GET_FILE_UPLOAD_URL, { params });
    return response.data.data;
  }
  // 图片上传确认
  async confirmPictureUploaded(params) {
    try {
      const response = await this.post(Api.CONFIRM_PICTURE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        originalUploadUrl: urlUtil.extractObjectName(
          params.uploadUrls.originalUploadUrl
        ),
        thumbnailUploadUrl: urlUtil.extractObjectName(
          params.uploadUrls.thumbnailUploadUrl
        ),
        messageId: params.messageId
      });
      return response.data;
    } catch (e) {
      return this.errorResponse(e);
    }
  }
  // 语音上传确认
  async confirmVoiceUploaded(params) {
    try {
      const response = await this.post(Api.CONFIRM_VOICE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(params.uploadUrls.uploadUrl),
        duration: params.duration,
        messageId: params.messageId
      });
      return response.data;
    } catch (e) {
      return this.errorResponse(e);
    }
  }
  // 视频上传确认
  async confirmVideoUploaded(params) {
    try {
      const response = await this.post(Api.CONFIRM_VIDEO_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(
          params.uploadUrls.originalUploadUrl
        ),
        thumbnailObject: urlUtil.extractObjectName(
          params.uploadUrls.previewUploadUrl
        ),
        videoDuration: params.videoDuration,
        fileSize: params.fileSize,
        messageId: params.messageId
      });
      return response.data;
    } catch (e) {
      return this.errorResponse(e);
    }
  }
  // 文件上传确认
  async confirmFileUploaded(params) {
    try {
      const response = await this.post(Api.CONFIRM_FILE_UPLOAD, {
        fromUserId: store.get(uidKey),
        targetId: params.targetId,
        contactType: params.contactType,
        sessionId: params.sessionId,
        fileObject: urlUtil.extractObjectName(params.uploadUrls.uploadUrl),
        fileName: params.fileName,
        fileSize: params.fileSize,
        messageId: params.messageId
      });
      return response.data;
    } catch (e) {
      return this.errorResponse(e);
    }
  }
  errorResponse(e) {
    if (e?.name === "ApiError") {
      return {
        success: false,
        errCode: e.errCode ?? -1,
        errMsg: e.errMsg ?? "请求失败"
      };
    }
    return {
      success: false,
      errCode: -1,
      errMsg: e?.message || "网络或系统异常"
    };
  }
}
minioInstance.interceptors.request.use(
  (config) => {
    return config;
  },
  (_error) => {
    return Promise.reject("文件请求发送失败");
  }
);
minioInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error(error);
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
  constructor(axiosInstance) {
    this.axiosInstance = axiosInstance;
  }
  async simpleUploadFile(uploadUrl, fileBuffer, mimeType) {
    console.info(
      "上传URL，文件大小，MIME类型:",
      uploadUrl,
      fileBuffer.length,
      mimeType
    );
    try {
      new URL(uploadUrl);
    } catch {
      throw new Error(`无效的上传URL: ${uploadUrl}`);
    }
    try {
      const response = await netMinIO.getAxiosInstance().put(uploadUrl, fileBuffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": fileBuffer.length.toString(),
          Connection: "close"
        }
      });
      console.log("上传响应:", response);
      if (response.status >= 200 && response.status < 300) {
        return;
      } else {
        throw new Error(`上传失败，状态码: ${response.status}`);
      }
    } catch (error) {
      console.error("上传请求错误:", error);
      throw error;
    }
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
  // 图片专用进度下载
  async downloadImageWithProgress(imageUrl, options = {}) {
    console.log("开始下载图片:", imageUrl);
    const startTime = Date.now();
    const response = await this.axiosInstance.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 3e4,
      headers: {
        Accept: "image/*"
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.round(loaded / total * 100);
          const elapsed = (Date.now() - startTime) / 1e3;
          const speed = elapsed > 0 ? loaded / elapsed : 0;
          const remaining = total - loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          });
        }
      }
    });
    console.log(
      "下载响应类型:",
      typeof response.data,
      response.data?.constructor?.name
    );
    return response.data;
  }
  // 音频专用进度下载
  async downloadAudioWithProgress(audioUrl, options = {}) {
    console.log("开始下载音频:", audioUrl);
    const startTime = Date.now();
    const response = await this.axiosInstance.get(audioUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 3e4,
      headers: {
        Accept: "audio/*"
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.round(loaded / total * 100);
          const elapsed = (Date.now() - startTime) / 1e3;
          const speed = elapsed > 0 ? loaded / elapsed : 0;
          const remaining = total - loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          });
        }
      }
    });
    console.log(
      "音频下载响应类型:",
      typeof response.data,
      response.data?.constructor?.name
    );
    return response.data;
  }
  // 视频专用进度下载
  async downloadVideoWithProgress(videoUrl, options = {}) {
    console.log("开始下载视频:", videoUrl);
    const startTime = Date.now();
    const response = await this.axiosInstance.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 6e4,
      headers: {
        Accept: "video/*"
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.round(loaded / total * 100);
          const elapsed = (Date.now() - startTime) / 1e3;
          const speed = elapsed > 0 ? loaded / elapsed : 0;
          const remaining = total - loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          });
        }
      }
    });
    console.log(
      "视频下载响应类型:",
      typeof response.data,
      response.data?.constructor?.name
    );
    return response.data;
  }
  // 文件专用进度下载
  async downloadFileWithProgress(fileUrl, options = {}) {
    console.log("开始下载文件:", fileUrl);
    const startTime = Date.now();
    const response = await this.axiosInstance.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: options.timeout || 6e4,
      headers: {
        Accept: "*/*"
      },
      onDownloadProgress: (progressEvent) => {
        if (options.onProgress && progressEvent.total) {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total;
          const percentage = Math.round(loaded / total * 100);
          const elapsed = (Date.now() - startTime) / 1e3;
          const speed = elapsed > 0 ? loaded / elapsed : 0;
          const remaining = total - loaded;
          const timeRemaining = speed > 0 ? remaining / speed : 0;
          options.onProgress({
            loaded,
            total,
            percentage,
            speed: Math.round(speed),
            timeRemaining: Math.round(timeRemaining)
          });
        }
      }
    });
    console.log("下载响应头信息:", {
      contentType: response.headers["content-type"],
      contentLength: response.headers["content-length"],
      allHeaders: response.headers
    });
    console.log(
      "文件下载响应类型:",
      typeof response.data,
      response.data?.constructor?.name
    );
    return response.data;
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
  getAxiosInstance() {
    return this.axiosInstance;
  }
}
const netMaster = new NetMaster(masterInstance);
const netMinIO = new NetMinIO(minioInstance);
class MediaTaskService {
  tasks = /* @__PURE__ */ new Map();
  tempDir = "";
  CHUNK_SIZE = 5 * 1024 * 1024;
  // 5MB 分块
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
    electron.ipcMain.handle(
      "media:send:start",
      async (event, params) => {
      }
    );
    electron.ipcMain.handle(
      "media:avatar:upload",
      async (_, { filePath, fileSize, fileSuffix }) => {
        try {
          console.log("开始上传头像:", { filePath, fileSize, fileSuffix });
          const uploadUrls = await netMaster.getUserAvatarUploadUrl(
            fileSize,
            fileSuffix
          );
          const mediaFile = await mediaUtil.getNormal(filePath);
          const originalFile = await mediaUtil.processImage(
            mediaFile,
            "original"
          );
          const thumbnailFile = await mediaUtil.processImage(
            mediaFile,
            "thumb"
          );
          await netMinIO.simpleUploadFile(
            uploadUrls.originalUploadUrl,
            originalFile.compressedBuffer,
            originalFile.newMimeType
          );
          await netMinIO.simpleUploadFile(
            uploadUrls.thumbnailUploadUrl,
            thumbnailFile.compressedBuffer,
            thumbnailFile.newMimeType
          );
          await netMaster.confirmUserAvatarUploaded(uploadUrls);
          console.log("确认上传完成头像URL:", uploadUrls.originalUploadUrl);
          return {
            success: true,
            avatarUrl: uploadUrls.originalUploadUrl.split("?")[0]
          };
        } catch (error) {
          console.error("Failed to upload avatar:", error);
          throw error;
        }
      }
    );
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
  "create table if not exists sessions(   session_id text primary key,   contact_id text not null,   contact_type integer not null,   contact_name text,   contact_avatar text,   contact_signature text,   last_msg_content text,   last_msg_time datetime,   unread_count integer default 0,   is_pinned integer default 0,   is_muted integer default 0,   member_count integer,   max_members integer,   join_mode integer,   msg_mode integer,   group_card text,   group_notification text,   my_role integer,   join_time datetime,   last_active datetime,   status integer default 1);",
  "create table if not exists messages(   id integer primary key autoincrement,   session_id text not null,   msg_id text not null,   sequence_id text not null,   sender_id text not null,   sender_name text,   msg_type integer not null,   is_recalled integer default 0,   text text,   ext_data text,   send_time datetime not null,   is_read integer default 0,   unique(session_id, sequence_id));",
  "create table if not exists blacklist(   id integer primary key autoincrement,   target_id text not null,   target_type integer not null,   create_time datetime);",
  "create table if not exists contact_applications(   apply_id text primary key,   apply_user_id text not null,   target_id text not null,   contact_type integer not null,   status integer,   apply_info text,   last_apply_time datetime);",
  "create table if not exists user_setting (   user_id varchar not null,   email varchar not null,   sys_setting varchar,   contact_no_read integer,   server_port integer,   primary key (user_id));",
  // Profile缓存表：统一管理用户和群组的头像、昵称信息
  "create table if not exists profiles (   target_id text not null,   contact_type integer not null,   nickname text,   nick_version text default '0',   avatar_version text default '0',   avatar_original_path text,   avatar_thumb_path text,   last_nick_update integer default 0,   last_avatar_update integer default 0,   created_at integer default 0,   primary key (target_id, contact_type));"
];
const add_indexes = [
  "create index if not exists idx_sessions_contact_type_time on sessions(contact_type, last_msg_time desc);",
  "create index if not exists idx_sessions_contact on sessions(contact_id, contact_type);",
  "create index if not exists idx_sessions_unread on sessions(unread_count desc, last_msg_time desc);",
  "create index if not exists idx_messages_session_time on messages(session_id, send_time desc);",
  "create index if not exists idx_messages_sender on messages(sender_id);",
  "create index if not exists idx_blacklist_target on blacklist(target_id, target_type);",
  "create index if not exists idx_applications_user_target on contact_applications(apply_user_id, target_id, contact_type);",
  "create index if not exists idx_applications_status on contact_applications(status);",
  // Profile表索引：优化查询性能
  "create index if not exists idx_profiles_target on profiles(target_id, contact_type);",
  "create index if not exists idx_profiles_nick_update on profiles(last_nick_update desc);",
  "create index if not exists idx_profiles_avatar_update on profiles(last_avatar_update desc);"
];
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
        console.error("SQL查询失败", {
          sql,
          params,
          error: err.message,
          stack: err.stack
        });
        resolve([]);
        return;
      }
      const result = rows.map(
        (item) => convertDb2Biz(item)
      );
      console.info(sql, params, result);
      resolve(result);
    });
    stmt.finalize();
  });
};
const queryOne = (sql, params) => {
  return new Promise((resolve) => {
    const stmt = dataBase.prepare(sql);
    stmt.get(params, function(err, row) {
      if (err) {
        console.error("SQL查询失败", {
          sql,
          params,
          error: err.message,
          stack: err.stack
        });
        resolve(null);
        return;
      }
      resolve(convertDb2Biz(row));
    });
    stmt.finalize();
  });
};
const sqliteRun = (sql, params) => {
  return new Promise((resolve, reject) => {
    const stmt = dataBase.prepare(sql);
    stmt.run(params, function(err) {
      if (err) {
        console.error("SQL执行失败", {
          sql,
          params,
          error: err.message,
          stack: err.stack
        });
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
const batchInsert = (tableName, dataList) => {
  const columnMap = globalColumnMap[tableName];
  const firstData = dataList[0];
  const columns = [];
  for (const item in firstData) {
    if (firstData[item] != void 0 && columnMap[item] != void 0) {
      columns.push(columnMap[item]);
    }
  }
  const placeholders = Array(columns.length).fill("?").join(",");
  const valuesPlaceholders = dataList.map(() => `(${placeholders})`).join(",");
  const sql = `INSERT OR IGNORE INTO ${tableName}(${columns.join(",")}) VALUES ${valuesPlaceholders}`;
  const params = [];
  for (const data of dataList) {
    for (const column of columns) {
      const bizField = Object.keys(columnMap).find(
        (key) => columnMap[key] === column
      );
      params.push(data[bizField]);
    }
  }
  console.log("sql语句", sql, params);
  return sqliteRun(sql, params);
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
    const rows = await queryAll(
      `SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`,
      params
    );
    const totalRow = await queryAll(
      `SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : []
    );
    return { list: rows, total: totalRow[0]?.total || 0 };
  }
  async loadOutgoingApplications(pageNo, pageSize, currentUserId) {
    const offset = (pageNo - 1) * pageSize;
    const where = currentUserId ? "WHERE apply_user_id = ?" : "";
    const params = currentUserId ? [currentUserId, pageSize, offset] : [pageSize, offset];
    const rows = await queryAll(
      `SELECT * FROM contact_applications ${where}
    ORDER BY last_apply_time DESC LIMIT ? OFFSET ?`,
      params
    );
    const totalRow = await queryAll(
      `SELECT COUNT(1) AS total FROM contact_applications ${where}`,
      currentUserId ? [currentUserId] : []
    );
    return { list: rows, total: totalRow[0]?.total || 0 };
  }
  async approveIncoming(ids) {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => "?").join(",");
    const sql = `UPDATE contact_applications SET status = 1 WHERE id IN (${placeholders})`;
    return sqliteRun(sql, ids);
  }
  async insertApplication(params) {
    return insertOrIgnore("contact_applications", params);
  }
  async insertMoreApplication(paramsList) {
    return batchInsert("contact_applications", paramsList);
  }
  async getCursor() {
    const sql = "select max(last_apply_time) as cursor from contact_applications where target_id = ?";
    const cursor = await queryAll(sql, [store.get(uidKey)]);
    return cursor[0]?.cursor || "";
  }
  async deleteApplication(applyId) {
    const sql = "delete from contact_applications where apply_id = ?";
    return sqliteRun(sql, [applyId]);
  }
}
const applicationDao = new ApplicationDao();
class ApplicationService {
  beginServe() {
    electron.ipcMain.on(
      "application:incoming:load",
      async (event, { pageNo, pageSize }) => {
        const data = await applicationDao.loadIncomingApplications(
          pageNo,
          pageSize,
          store.get(uidKey)
        );
        event.sender.send("application:incoming:loaded", data);
      }
    );
    electron.ipcMain.on(
      "application:outgoing:load",
      async (event, { pageNo, pageSize }) => {
        const data = await applicationDao.loadOutgoingApplications(
          pageNo,
          pageSize,
          store.get(uidKey)
        );
        event.sender.send("application:outgoing:loaded", data);
      }
    );
  }
  // 插入数据库，不负责创建会话，就算是好友同意，也应该与创建会话业务分离
  async handleSingleApplication(msg) {
    await applicationDao.deleteApplication(msg.applyId);
    await applicationDao.insertApplication(msg);
  }
  async handleMoreApplication(applys) {
    if (applys.length > 0) {
      console.info("application-service:handle-more-application", applys);
      await applicationDao.insertMoreApplication(applys);
    }
  }
}
const applicationService = new ApplicationService();
class BlackDao {
  async loadBlacklist(pageNo, pageSize) {
    const offset = (pageNo - 1) * pageSize;
    const rows = await queryAll(
      `SELECT * FROM blacklist ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    const totalRow = await queryAll(
      `SELECT COUNT(1) AS total FROM blacklist`,
      []
    );
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
class MessageAdapter {
  /**
   * 将 WebSocket 消息转换为 Message 对象
   */
  adaptWebSocketMessage(msg, insertId) {
    return {
      id: Number(insertId) || 0,
      sessionId: msg.sessionId,
      content: String(msg.content ?? ""),
      messageType: "text",
      senderId: msg.senderId,
      senderName: msg.fromName ?? "",
      timestamp: new Date(Number(msg.adjustedTimestamp)),
      isRead: true,
      avatarVersion: String(msg.extra["avatarVersion"]),
      nicknameVersion: String(msg.extra["nicknameVersion"])
    };
  }
  /**
   * 将 WebSocket 消息转换为数据库消息格式
   */
  adaptToDatabaseMessage(message) {
    const date = new Date(Number(message.adjustedTimestamp)).toISOString();
    return {
      sessionId: String(message.sessionId),
      sequenceId: message.sequenceNumber,
      senderId: String(message.senderId),
      msgId: message.messageId,
      senderName: message.fromName || "",
      msgType: message.messageType,
      isRecalled: 0,
      text: message.content,
      extData: JSON.stringify(message.extra),
      sendTime: date,
      isRead: 1
    };
  }
  /**
   * 将数据库消息行转换为 Message 对象
   */
  adaptMessageRowToMessage(row) {
    const extData = JSON.parse(row.extData || "{}");
    const getMessageType = (msgType) => {
      switch (msgType) {
        case 1:
          return "text";
        case 2:
          return "image";
        case 3:
          return "voice";
        case 4:
          return "video";
        case 5:
          return "file";
        default:
          return "text";
      }
    };
    return {
      id: row.id,
      sessionId: row.sessionId,
      content: row.text || row.extData || "",
      messageType: getMessageType(row.msgType),
      senderId: row.senderId,
      senderName: row.senderName || "",
      timestamp: new Date(row.sendTime),
      isRead: !!row.isRead,
      avatarVersion: String(extData.avatarVersion || ""),
      nicknameVersion: String(extData.nicknameVersion || "")
    };
  }
}
const messageAdapter = new MessageAdapter();
class MessageDao {
  async addLocalMessage(data) {
    const changes = await insertOrIgnore("messages", data);
    if (!changes) return 0;
    const rows = await queryAll(
      "select id from messages where session_id = ? and sequence_id = ? LIMIT 1",
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
      let where = "where session_id = ?";
      const params = [sessionId];
      let sendTimeOrder = "desc";
      if (direction === "older" && beforeId) {
        const beforeMessage = await queryAll(
          "select send_time from messages where id = ?",
          [beforeId]
        );
        if (beforeMessage.length > 0) {
          where += " and send_time < ?";
          params.push(beforeMessage[0].sendTime);
        }
      } else if (direction === "newer" && afterId) {
        sendTimeOrder = "asc";
        const afterMessage = await queryAll(
          "select send_time from messages where id = ?",
          [afterId]
        );
        if (afterMessage.length > 0) {
          where += " and send_time > ?";
          params.push(afterMessage[0].sendTime);
        }
      }
      const sql = `
        select id, session_id, sequence_id, sender_id, sender_name, msg_type, is_recalled,
               text, ext_data, send_time, is_read
        from messages
        ${where}
        order by send_time ${sendTimeOrder}, id desc
        LIMIT ${limit}
      `;
      const rows = await queryAll(sql, params);
      const messages = rows.map(
        (r) => messageAdapter.adaptMessageRowToMessage(r)
      );
      const totalCountRow = await queryAll(
        "select count(1) as total from messages where session_id = ?",
        [sessionId]
      );
      const totalCount = totalCountRow[0]?.total || 0;
      let hasMore = false;
      if (messages.length > 0) {
        const lastMessage = messages.at(-1);
        const moreRow = await queryAll(
          "select count(1) as cnt from messages where session_id = ? and send_time < ?",
          [sessionId, lastMessage.timestamp.toString()]
        );
        hasMore = (moreRow[0]?.cnt || 0) > 0;
      }
      console.log(
        "查询参数:",
        options,
        "返回消息数:",
        messages.length,
        "hasMore:",
        hasMore
      );
      return { messages, hasMore, totalCount };
    } catch (error) {
      console.error("获取会话消息失败:", error);
      return { messages: [], hasMore: false, totalCount: 0 };
    }
  }
  async getExtendData(params) {
    try {
      const rows = await queryAll(
        "select ext_data from messages where id = ?",
        [params.id]
      );
      const extDataString = rows[0]?.extData || "{}";
      return JSON.parse(extDataString);
    } catch (error) {
      console.error("获取外部数据失败:", error);
      return null;
    }
  }
  async updateLocalPath(id, data) {
    try {
      const extData = await this.getExtendData({ id });
      Object.assign(extData, data);
      const extDataString = JSON.stringify(extData);
      await update("messages", { extData: extDataString }, { id });
    } catch (error) {
      console.error("更新扩展数据失败:", error);
    }
  }
}
const messageDao = new MessageDao();
class SessionDao {
  async selectSessions() {
    const sql = "select * from sessions";
    const result = await queryAll(sql, []);
    return result;
  }
  async selectSingleSession(sessionId) {
    const sql = "select * from sessions where session_id = ?";
    const result = await queryAll(sql, [sessionId]);
    return result[0];
  }
  // 为了校正无效的 session，先全部弃用
  async abandonAllSession() {
    try {
      const sql = "UPDATE sessions SET status = 0";
      const result = await sqliteRun(sql, []);
      console.log(`session-dao:已弃用 ${result} 个会话`);
      return result;
    } catch (error) {
      console.error("session-dao:弃用所有会话失败:", error);
      throw error;
    }
  }
  async insertOrIgnoreContact(contact) {
    return insertOrIgnore("sessions", contact);
  }
  // 只有消息更新，才需要更新会话 20251019（发现 bug，为 null 时不会更新，已修）
  async keepSessionFresh(data) {
    const sql = `UPDATE sessions
                 SET last_msg_time = ?, last_msg_content = ?
                 WHERE session_id = ? AND (last_msg_time IS NULL OR datetime(?) > datetime(last_msg_time))`;
    return sqliteRun(sql, [
      data.sendTime,
      data.content,
      data.sessionId,
      data.sendTime
    ]);
  }
  //  根据 sessionId，更新会话的某些字段
  async updatePartialBySessionId(params, sessionId) {
    try {
      const result = await update("sessions", params, { sessionId });
      return result;
    } catch {
      console.error("updatePartialBySessionId:updateSession 失败");
      return 0;
    }
  }
  //  根据 contactId，更新会话的某些字段
  async updatePartialByContactId(params, contactId) {
    try {
      const result = await update("sessions", params, { contactId });
      return result;
    } catch {
      console.error("updatePartialByContactId:updateSession 失败");
      return 0;
    }
  }
  //  收集所有 session 的 id
  async selectAllSessionId() {
    const sql = "SELECT session_id FROM sessions";
    const result = await queryAll(sql, []);
    return result;
  }
}
const sessionDao = new SessionDao();
const getMessageId = () => {
  const time = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1e6));
  return (time << 20n | rand).toString();
};
class ChannelUtil {
  channel = null;
  isWsOpen = () => !!this.channel && this.channel.readyState === WebSocket.OPEN;
  registerChannel(channel) {
    this.channel = channel;
  }
  sendText(payload) {
    if (!this.isWsOpen()) return;
    const fromUserId = String(payload.fromUserId || "");
    const targetId = String(payload.targetId || "");
    const sessionId = String(payload.sessionId || "");
    const content = payload.content;
    if (!fromUserId || !sessionId || !targetId || !content) {
      console.warn("缺少必要字段，发送取消");
      return;
    }
    const textMessage = {
      messageId: getMessageId(),
      type: 1,
      fromUserId,
      targetId,
      sessionId,
      content,
      timestamp: Date.now(),
      extra: { platform: "desktop" }
    };
    this.channel.send(JSON.stringify(textMessage));
  }
  sendSingleChatAckConfirm(msg) {
    if (!this.isWsOpen()) return;
    this.channel.send(
      JSON.stringify({
        messageId: msg.messageId,
        type: 101,
        fromUserId: store.get(uidKey)
      })
    );
  }
  sendSingleApplicationAckConfirm(msg) {
    if (!this.isWsOpen()) return;
    this.channel.send(
      JSON.stringify({
        messageId: msg.applyId,
        type: 102,
        fromUserId: store.get(uidKey)
      })
    );
  }
  sendSingleSessionAckConfirm(msg) {
    if (!this.isWsOpen()) return;
    this.channel.send(
      JSON.stringify({
        messageId: msg.ackId,
        type: 103,
        fromUserId: store.get(uidKey)
      })
    );
  }
}
const channelUtil = new ChannelUtil();
class MessageService {
  beginServe() {
    electron.ipcMain.handle("websocket:send", async (_, msg) => {
      console.log(msg);
      try {
        channelUtil.sendText(msg);
        console.log("发送成功");
        return true;
      } catch (error) {
        console.error("发送消息失败:", error);
        return false;
      }
    });
    electron.ipcMain.handle(
      "message:get-by-sessionId",
      (_, sessionId, options) => {
        return messageDao.getMessageBySessionId(String(sessionId), options);
      }
    );
  }
  async handleSingleMessage(message) {
    console.log("message-service:handle-single-message", message);
    const messageData = messageAdapter.adaptToDatabaseMessage(message);
    const msgId = await messageDao.addLocalMessage(messageData);
    await sessionDao.keepSessionFresh({
      content: objectUtil.getContentByRow(messageData),
      sendTime: new Date(Number(message.adjustedTimestamp)).toISOString(),
      sessionId: message.sessionId
    });
    return msgId;
  }
  async getExtendData(params) {
    return messageDao.getExtendData(params);
  }
}
const messageService = new MessageService();
class SessionService {
  beginServe() {
    electron.ipcMain.handle(
      "session:update:partial",
      async (_, params, sessionId) => {
        return await sessionDao.updatePartialBySessionId(params, sessionId);
      }
    );
    electron.ipcMain.on("session:load-data", async (event) => {
      console.log("开始查询session");
      const result = await sessionDao.selectSessions();
      console.log("查询结果:", result);
      event.sender.send("session:call-back:load-data", result);
    });
  }
  // 填充会话的消息
  async fillSession(contactList) {
    const groupList = [];
    const userList = [];
    const promiseList = [];
    contactList.forEach((contact) => {
      promiseList.push(sessionService.insertAndCheckSession(contact));
    });
    const resultList = await Promise.all(promiseList);
    for (const result of resultList) {
      if (result && result.contactId) {
        if (result.contactType === 1) {
          userList.push(result.contactId);
        } else if (result.contactType === 2) {
          groupList.push(result.contactId);
        }
      }
    }
    if (userList.length > 0) {
      console.info(
        "session-service:fill-session:需要获取用户信息，数量:",
        userList.length
      );
      try {
        const response = await netMaster.post(Api.GET_BASE_USER, {
          targetList: userList
        });
        if (response.data.success) {
          const data = response.data.data;
          console.info(
            "session-service:fill-session:获取用户信息成功，数量:",
            data.userInfoList?.length || 0
          );
          await sessionService.updateBaseUserInfoList(data.userInfoList);
        } else {
          console.error(
            "session-service:fill-session:获取用户信息失败:",
            response.data.errMsg
          );
        }
      } catch (error) {
        console.error("session-service:fill-session:获取用户信息异常:", error);
      }
    }
    if (groupList.length > 0) {
      console.info(
        "session-service:fill-session:需要获取群组信息，数量:",
        groupList.length
      );
      try {
        const response = await netMaster.post(Api.GET_BASE_GROUP, {
          targetList: groupList
        });
        if (response.data.success) {
          const data = response.data.data;
          console.info(
            "session-service:fill-session:获取群组信息成功，数量:",
            data.groupInfoList?.length || 0
          );
          await sessionService.updateBaseGroupInfoList(data.groupInfoList);
        } else {
          console.error(
            "session-service:fill-session:获取群组信息失败:",
            response.data.errMsg
          );
        }
      } catch (error) {
        console.error("session-service:fill-session:获取群组信息异常:", error);
      }
    }
  }
  async selectSingleSessionById(sessionId) {
    return sessionDao.selectSingleSession(sessionId);
  }
  // 批量设置用户头像、名字
  async updateBaseUserInfoList(list) {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        { contactName: info.nickname, contactAvatar: info.avatar },
        info.userId
      );
    }
  }
  // 批量设置群组头像、群名
  async updateBaseGroupInfoList(list) {
    for (const info of list) {
      await sessionDao.updatePartialByContactId(
        { contactName: info.groupName, contactAvatar: info.avatar },
        info.groupId
      );
    }
  }
  // 如果插入后发现不存在，或者 contact_name 或者 contact_avatar 字段缺失，返回 contact，代表要查 api
  async insertAndCheckSession(contact) {
    const obj = {
      sessionId: contact.sessionId,
      contactType: contact.contactType,
      contactId: contact.contactId
    };
    if (contact.myRole) Object.assign(obj, { myRole: contact.myRole });
    const change = await sessionDao.insertOrIgnoreContact(obj);
    console.info("session-service:check-session:insert:", obj);
    if (change > 0) {
      return contact;
    } else {
      await sessionDao.updatePartialBySessionId(
        { status: 1 },
        contact.sessionId
      );
    }
    const one = await sessionDao.selectSingleSession(contact.sessionId);
    if (one?.contactAvatar && one?.contactName) {
      return { sessionId: contact.sessionId };
    } else {
      return contact;
    }
  }
  // 退群或者被删，会话被弃用
  async deprecateSession(sessionId) {
    await sessionDao.updatePartialBySessionId(
      { status: 0 },
      sessionId
    );
  }
  // 整理所有会话的最后一条消息
  async tidySessionOfLastMessage() {
    const result = await sessionDao.selectAllSessionId();
    for (const session of result) {
      const msgResult = await messageDao.getMessageBySessionId(
        session.sessionId,
        { limit: 1, direction: "newest" }
      );
      if (msgResult.messages.length > 0) {
        const content = objectUtil.getContentByMessage(msgResult.messages[0]);
        const obj = {
          lastMsgTime: msgResult.messages[0].timestamp.toISOString(),
          lastMsgContent: content
        };
        console.info(
          "session-service:tidy-session:update-session:",
          obj,
          session.sessionId
        );
        await sessionDao.updatePartialBySessionId(
          obj,
          session.sessionId
        );
      } else {
        console.info(
          "session-service:tidy-session:no-message:",
          session.sessionId
        );
      }
    }
  }
}
const sessionService = new SessionService();
class WebsocketHandler {
  // 聊天消息
  async handleChatMessage(msg) {
    console.log("handleMessage", msg);
    const insertId = await messageService.handleSingleMessage(msg);
    if (!insertId || insertId <= 0) return;
    const vo = messageAdapter.adaptWebSocketMessage(msg, insertId);
    channelUtil.sendSingleChatAckConfirm(msg);
    const session = await sessionDao.selectSingleSession(
      msg.sessionId
    );
    const mainWindow = electron.BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.send("message:call-back:load-data", [vo]);
    mainWindow.webContents.send("session:call-back:load-data", [session]);
  }
  // 申请通知
  async handleApplication(msg) {
    delete msg.receiverId;
    await applicationService.handleSingleApplication(msg);
    channelUtil.sendSingleApplicationAckConfirm(msg);
    const mainWindow = electron.BrowserWindow.getAllWindows()[0];
    mainWindow.webContents.send("income-list:call-back:load-data", "ping");
    mainWindow.webContents.send("out-send-list:call-back:load-data", "ping");
  }
  // 填充会话信息，发送 ack 确认，发送渲染进程响应    (单聊、多聊创建，单聊、多聊解散)[往往伴随着会话变更]
  async handleSession(msg) {
    console.info("handle-session:", msg);
    const type = msg.metaSessionType <= 2 ? 1 : 2;
    Object.assign(msg, { contactType: type });
    if (msg.metaSessionType === 2 || msg.metaSessionType === 4) {
      await sessionService.deprecateSession(msg.sessionId);
    } else {
      await sessionService.fillSession([msg]);
    }
    channelUtil.sendSingleSessionAckConfirm(msg);
    const session = await sessionService.selectSingleSessionById(msg.sessionId);
    log.info("handle-session:select", session);
    if (session) {
      const mainWindow = electron.BrowserWindow.getAllWindows()[0];
      mainWindow.webContents.send("session:call-back:load-data", [session]);
    }
  }
  async handleBlack(msg) {
  }
  // 被强制下线、被警告
  async handleClientEvent(msg) {
  }
}
const websocketHandler = new WebsocketHandler();
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
  channelUtil.registerChannel(ws);
  ws.on("open", () => {
    console.info("客户端连接成功");
    maxReConnectTimes = 100;
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
    if (msg?.messageType) {
      console.info("聊天信息处理");
      await websocketHandler.handleChatMessage(msg);
      return;
    }
    if (msg?.applyInfo) {
      console.info("申请信息处理");
      await websocketHandler.handleApplication(msg);
      return;
    }
    if (msg?.metaSessionType) {
      console.info("会话信息处理");
      await websocketHandler.handleSession(msg);
      return;
    }
    if (msg?.eventType) {
      console.info("事件处理");
      return;
    }
    if (msg?.behaviourType) {
      console.info("事件处理");
      return;
    }
  });
};
class PullService {
  async pullData() {
    try {
      await this.pullContact();
      await this.pullApply();
      await this.pullMailboxMessages();
      console.log(`pull-service:pull-data:completed`);
    } catch (error) {
      console.error(`pull-service:pull-data:fail:`, error);
      throw error;
    }
  }
  // 重新拉取会话信息
  async pullContact() {
    console.log(`pull-service:pull-session:begin`);
    const response = await netMaster.get(Api.PULL_CONTACT);
    if (!response.data.success) {
      console.error(
        "pull-service:pull-friend-contact:拉取 session 失败:",
        response.data.errMsg
      );
      return;
    }
    const result = response.data.data;
    console.log("pull-service:pullContact:result", result);
    await this.adjustLocalDb(result);
  }
  // 游标拉取申请通知
  async pullApply() {
    console.log("pull-service:pull-apply:begin");
    const cursor = await applicationDao.getCursor();
    console.log("pull-service:pull-apply:cursor", cursor);
    const payload = { pageSize: 100 };
    if (cursor) Object.assign(payload, { cursor });
    let response = await netMaster.get(Api.PULL_APPLICATION, {
      params: payload
    });
    if (!response.data.success) {
      console.error(
        "pull-service:pull-apply:拉取申请通知失败:",
        response.data.errMsg
      );
      return;
    }
    await applicationService.handleMoreApplication(response.data.data.list);
    while (!response.data.data.isLast) {
      payload.cursor = response.data.data.cursor;
      response = await netMaster.get(Api.PULL_APPLICATION, { params: payload });
      if (!response.data.success) {
        console.error(
          "pull-service:pull-apply:拉取申请通知失败:",
          response.data.errMsg
        );
        return;
      }
      await applicationService.handleMoreApplication(response.data.data.list);
    }
  }
  // 拉取用户信箱的所有消息
  async pullMailboxMessages() {
    try {
      console.info(
        "pull-service:pull-offline-message:开始拉取用户离线消息...",
        `${Api.PULL_MAILBOX}`
      );
      const response = await netMaster.get(Api.PULL_MAILBOX);
      if (!response.data.success) {
        console.error(
          "pull-service:pull-offline-message:拉取离线消息失败:",
          response.data.errMsg
        );
        return;
      }
      const pullResult = response.data.data;
      if (!pullResult || !pullResult.messageList || pullResult.messageList.length === 0) {
        console.info("pull-service:pull-offline-message:没有离线消息需要拉取");
        return;
      }
      console.info(
        `pull-service:拉取到 ${pullResult.messageList.length} 条离线消息`
      );
      const promiseList = [];
      const messageIds = [];
      for (const message of pullResult.messageList) {
        promiseList.push(messageService.handleSingleMessage(message));
        messageIds.push(message.messageId);
      }
      await Promise.all(promiseList);
      if (messageIds.length > 0) {
        await this.ackConfirmMessages(messageIds);
      }
      if (pullResult.hasMore) {
        console.info("还有更多离线消息，继续拉取...");
        setTimeout(() => {
          this.pullMailboxMessages();
        }, 0);
      } else {
        console.info("离线消息拉取完成");
      }
    } catch (error) {
      console.error("拉取离线消息异常:", error);
    }
  }
  // 批量 ack 确认
  async ackConfirmMessages(messageIds) {
    try {
      console.info(`确认 ${messageIds.length} 条消息`, messageIds);
      const requestData = { messageIdList: messageIds };
      const response = await netMaster.post(Api.ACK_CONFIRM, requestData);
      if (response.data.success) {
        console.info("消息确认成功");
      } else {
        console.error("消息确认失败:", response.data.errMsg);
      }
    } catch (error) {
      console.error("消息确认异常:", error);
    }
  }
  // 修正本地数据库，根据本地数据是否缺失，策略化请求 api 拿头像、名字信息
  async adjustLocalDb(myContactList) {
    try {
      if (!myContactList || !myContactList.contactList || !Array.isArray(myContactList.contactList)) {
        console.warn(
          "pull-service:adjust-local-db:contactList 数据无效:",
          myContactList
        );
        return;
      }
      console.info(
        "pull-service:adjust-local-db:开始处理联系人列表，数量:",
        myContactList.contactList.length
      );
      await sessionDao.abandonAllSession();
      await sessionService.fillSession(myContactList.contactList);
    } catch (error) {
      console.error("pull-service:adjust-local-db:处理失败:", error);
      throw error;
    }
  }
}
const pullService = new PullService();
class AtomDao {
  async initializeUserData(userId) {
    connectWs();
    urlUtil.redirectSqlPath(userId);
    if (!redirectDataBase()) {
      console.info("initializeUserData: 未检测到本地数据库，新创建数据库");
    }
    await initTable();
    await pullService.pullData();
    await sessionService.tidySessionOfLastMessage();
  }
}
const atomDao = new AtomDao();
const test = async (blob) => {
  console.log("=== 开始分析录音文件 ===");
  console.log("接收到的ArrayBuffer大小:", blob.byteLength, "bytes");
  const inputPath = "D:/multi-media-material/temp/input.webm";
  const outPutPath = "D:/multi-media-material/compress/audio_compressed.webm";
  urlUtil.ensureDir(path.dirname(inputPath));
  const buffer = Buffer.from(blob);
  console.log("转换后的Buffer大小:", buffer.length, "bytes");
  await compressAudio(inputPath, outPutPath);
};
const compressAudio = async (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      reject(new Error(`输入文件不存在: ${inputPath}`));
      return;
    }
    const inputStats = fs.statSync(inputPath);
    console.log(`输入文件大小: ${(inputStats.size / 1024).toFixed(1)}KB`);
    if (inputStats.size === 0) {
      reject(new Error("输入文件为空"));
      return;
    }
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    console.log("开始FFmpeg压缩...");
    console.log("输入文件:", inputPath);
    console.log("输出文件:", outputPath);
    ffmpeg(inputPath).audioCodec("libopus").audioBitrate("24k").audioFrequency(16e3).audioChannels(1).format("webm").outputOptions([
      "-avoid_negative_ts",
      "make_zero",
      // 避免负时间戳
      "-fflags",
      "+genpts"
      // 生成PTS
    ]).on("start", (commandLine) => {
      console.log("FFmpeg命令:", commandLine);
    }).on("progress", (progress) => {
      console.log("压缩进度:", progress.percent + "%");
    }).on("end", () => {
      console.log("FFmpeg处理完成");
      if (!fs.existsSync(outputPath)) {
        reject(new Error("输出文件未生成"));
        return;
      }
      const outputStats = fs.statSync(outputPath);
      console.log(`压缩后大小: ${(outputStats.size / 1024).toFixed(1)}KB`);
      if (outputStats.size === 0) {
        reject(new Error("输出文件为空"));
        return;
      }
      const buffer = fs.readFileSync(outputPath);
      const header = buffer.subarray(0, 4);
      if (buffer.length >= 4) {
        console.log(
          "文件头字节:",
          Array.from(header).map((b) => "0x" + b.toString(16).padStart(2, "0")).join(" ")
        );
        if (header[0] === 26 && header[1] === 69 && header[2] === 223 && header[3] === 163) {
          console.log("✅ WebM文件格式验证通过");
          resolve();
        } else {
          console.error("❌ 文件头不匹配WebM格式");
          reject(new Error("生成的文件不是有效的WebM格式"));
        }
      } else {
        reject(new Error("文件太小，可能损坏"));
      }
    }).on("error", (err) => {
      console.error("FFmpeg压缩失败:", err);
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
          console.log("已清理损坏的输出文件");
        } catch (cleanupErr) {
          console.error("清理文件失败:", cleanupErr);
        }
      }
      reject(err);
    }).save(outputPath);
  });
};
class DeviceService {
  LOGIN_WIDTH = 440;
  LOGIN_HEIGHT = 350;
  REGISTER_WIDTH = 440;
  REGISTER_HEIGHT = 600;
  MAIN_WIDTH = 800;
  MAIN_HEIGHT = 660;
  DEBUG_WIDTH = 800;
  DEBUG_HEIGHT = 600;
  debugWindow = null;
  beginServe(mainWindow) {
    electron.ipcMain.handle(
      "device:login-or-register",
      async (_, goRegister) => {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        }
        mainWindow.setMaximizable(false);
        mainWindow.setResizable(true);
        if (goRegister === false) {
          mainWindow.setSize(this.LOGIN_WIDTH, this.LOGIN_HEIGHT);
        } else {
          mainWindow.setSize(this.REGISTER_WIDTH, this.REGISTER_HEIGHT);
        }
        mainWindow.setResizable(false);
        mainWindow.center();
      }
    );
    electron.ipcMain.on("LoginSuccess", (_, userId) => {
      wsConfigInit();
      atomDao.initializeUserData(userId).then(() => {
        mainWindow.webContents.send("ws-connected");
        setTimeout(() => {
          this.smoothResizeWindow(mainWindow, 920, 740);
        }, 3e3);
      });
    });
    electron.ipcMain.on("main-initialized", () => {
      console.log("收到Main.vue初始化完成信号，转发给LoginView");
      mainWindow.webContents.send("main-initialized");
    });
    electron.ipcMain.on("debug-window-toggle", () => {
      this.toggleDebugWindow();
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
    electron.ipcMain.handle("device:select-file", async () => {
      try {
        const { dialog } = await import("electron");
        const result = await dialog.showOpenDialog({
          title: "选择头像文件",
          filters: [
            {
              name: "图片文件",
              extensions: ["png", "jpg", "jpeg", "gif", "webp"]
            }
          ],
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
        const dataUrl = `data:${mediaUtil.getMimeTypeBySuffix(ext)};base64,${base64Data}`;
        return {
          filePath,
          fileName: path.basename(filePath),
          fileSize: stats.size,
          fileSuffix: ext,
          mimeType: mediaUtil.getMimeTypeBySuffix(ext),
          dataUrl
        };
      } catch (error) {
        console.error("Failed to select avatar file:", error);
        throw error;
      }
    });
    electron.ipcMain.handle("device:get-audio-stream", async (_, constraints) => {
      try {
        console.log("开始获取音频流，约束条件:", constraints);
        return {
          success: true,
          constraints: {
            audio: {
              echoCancellation: constraints?.audio?.echoCancellation ?? true,
              noiseSuppression: constraints?.audio?.noiseSuppression ?? true,
              autoGainControl: constraints?.audio?.autoGainControl ?? true,
              // 优化音频参数以减少文件大小
              sampleRate: constraints?.audio?.sampleRate ?? 16e3,
              // 降低到16kHz（语音质量足够）
              channelCount: constraints?.audio?.channelCount ?? 1,
              // 单声道
              sampleSize: constraints?.audio?.sampleSize ?? 16,
              // 16位采样
              // 添加比特率限制（如果浏览器支持）
              bitrate: constraints?.audio?.bitrate ?? 32e3,
              // 32kbps比特率
              // 音频编码优化
              latency: 0.01,
              // 低延迟
              volume: 1
              // 音量
            }
          },
          // 提供特殊标识，表明这是通过Electron主进程验证的
          electronVerified: true,
          // 添加录音建议配置
          recordingOptions: {
            mimeType: "audio/webm;codecs=opus",
            // 使用Opus编解码器
            audioBitsPerSecond: 128e3
            // 32kbps比特率
          }
        };
      } catch (error) {
        console.error("获取音频流失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误"
        };
      }
    });
    electron.ipcMain.handle("file:get-preview-image", async (_, fileSuffix) => {
      try {
        const ext = fileSuffix.toLowerCase().replace(".", "");
        const supportedTypes = [
          "pdf",
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
          "java",
          "go"
        ];
        console.log("获取文件预览图:", ext);
        const appPath = electron.app.getAppPath();
        const getBasePath = () => {
          if (electron.app.isPackaged) {
            return path.join(
              process.resourcesPath,
              "shared",
              "resources",
              "file-preview"
            );
          } else {
            return path.join(
              appPath,
              "src",
              "shared",
              "resources",
              "file-preview"
            );
          }
        };
        const basePath = getBasePath();
        const fileName = supportedTypes.includes(ext) ? `${ext}.avif` : "no-supported.png";
        let previewImagePath = path.join(basePath, fileName);
        console.log("预览图路径:", previewImagePath);
        if (!fs.existsSync(previewImagePath)) {
          console.warn("预览图文件不存在:", previewImagePath);
          const defaultImagePath = path.join(basePath, "no-supported.png");
          if (!fs.existsSync(defaultImagePath)) {
            console.error("默认预览图也不存在:", defaultImagePath);
            return null;
          }
          previewImagePath = defaultImagePath;
        }
        const imageBuffer = fs.readFileSync(previewImagePath);
        const imageExt = path.extname(previewImagePath).toLowerCase();
        let mimeType = "image/png";
        switch (imageExt) {
          case ".avif":
            mimeType = "image/avif";
            break;
          case ".png":
            mimeType = "image/png";
            break;
          case ".jpg":
          case ".jpeg":
            mimeType = "image/jpeg";
            break;
          case ".webp":
            mimeType = "image/webp";
            break;
        }
        console.log(
          "预览图获取成功:",
          ext,
          "大小:",
          imageBuffer.length,
          "bytes"
        );
        return {
          success: true,
          data: imageBuffer,
          mimeType,
          size: imageBuffer.length
        };
      } catch (error) {
        console.error("获取文件预览图失败:", error);
        return null;
      }
    });
    electron.ipcMain.handle("file:show-in-folder", async (_, filePath) => {
      try {
        const url = new URL(filePath);
        const localPath = path.resolve(url.searchParams.get("path") || "");
        console.log("显示文件位置:", localPath);
        if (!fs.existsSync(path.resolve(localPath))) {
          throw new Error(`文件不存在: ${localPath}`);
        }
        electron.shell.showItemInFolder(path.resolve(localPath));
        return { success: true };
      } catch (error) {
        console.error("显示文件位置失败:", error);
        return { success: false, error: error.message };
      }
    });
    electron.ipcMain.handle("voice:convert-to-blob", async (_, filePath) => {
      try {
        console.log("转换音频文件为blob:", filePath);
        let localPath = filePath;
        if (filePath.startsWith("tellyou://")) {
          try {
            const url = new URL(filePath);
            localPath = decodeURIComponent(url.searchParams.get("path") || "");
          } catch (urlError) {
            console.warn("协议解析失败，使用原始路径:", filePath);
          }
        }
        const resolvedPath = path.resolve(localPath);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`音频文件不存在: ${resolvedPath}`);
        }
        const fileBuffer = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        let mimeType = "audio/mpeg";
        switch (ext) {
          case ".mp3":
            mimeType = "audio/mpeg";
            break;
          case ".wav":
            mimeType = "audio/wav";
            break;
          case ".ogg":
            mimeType = "audio/ogg";
            break;
          case ".aac":
            mimeType = "audio/aac";
            break;
          case ".m4a":
            mimeType = "audio/mp4";
            break;
          case ".webm":
            mimeType = "audio/webm";
            break;
          default:
            mimeType = "audio/mpeg";
        }
        const base64Data = fileBuffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        console.log("音频文件转换成功，大小:", fileBuffer.length, "bytes");
        return {
          success: true,
          dataUrl,
          mimeType,
          size: fileBuffer.length
        };
      } catch (error) {
        console.error("音频文件转blob失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    electron.ipcMain.handle("video:convert-to-blob", async (_, filePath) => {
      try {
        console.log("转换视频文件为blob:", filePath);
        if (!fs.existsSync(filePath)) {
          throw new Error(`文件不存在: ${filePath}`);
        }
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "video/mp4";
        switch (ext) {
          case ".mp4":
            mimeType = "video/mp4";
            break;
          case ".webm":
            mimeType = "video/webm";
            break;
          case ".ogg":
            mimeType = "video/ogg";
            break;
          case ".avi":
            mimeType = "video/x-msvideo";
            break;
          case ".mov":
            mimeType = "video/quicktime";
            break;
          default:
            mimeType = "video/mp4";
        }
        const base64Data = fileBuffer.toString("base64");
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        console.log("视频文件转换成功，大小:", fileBuffer.length, "bytes");
        return {
          success: true,
          dataUrl,
          mimeType,
          size: fileBuffer.length
        };
      } catch (error) {
        console.error("视频文件转blob失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    electron.ipcMain.handle("test", (_, data) => {
      test(data);
    });
  }
  /**
   * 平滑改变窗口大小
   * @param window 窗口实例
   * @param targetWidth 目标宽度
   * @param targetHeight 目标高度
   * @param duration 动画时长(毫秒)
   */
  smoothResizeWindow(window, targetWidth, targetHeight, duration = 300) {
    const currentBounds = window.getBounds();
    const startWidth = currentBounds.width;
    const startHeight = currentBounds.height;
    const startX = currentBounds.x;
    const startY = currentBounds.y;
    const targetX = startX + (startWidth - targetWidth) / 2;
    const targetY = startY + (startHeight - targetHeight) / 2;
    const startTime = Date.now();
    const easeOut = (t) => {
      return 1 - Math.pow(1 - t, 3);
    };
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const currentWidth = Math.round(
        startWidth + (targetWidth - startWidth) * easedProgress
      );
      const currentHeight = Math.round(
        startHeight + (targetHeight - startHeight) * easedProgress
      );
      const currentX = Math.round(startX + (targetX - startX) * easedProgress);
      const currentY = Math.round(startY + (targetY - startY) * easedProgress);
      window.setBounds({
        x: currentX,
        y: currentY,
        width: currentWidth,
        height: currentHeight
      });
      if (progress < 1) {
        setImmediate(animate);
      } else {
        window.setResizable(true);
        window.setMaximizable(true);
        window.setMinimumSize(this.MAIN_WIDTH, this.MAIN_HEIGHT);
        console.log("窗口平滑缩放完成");
      }
    };
    window.setResizable(true);
    animate();
  }
  /**
   * 切换调试窗口显示状态
   */
  toggleDebugWindow() {
    try {
      if (!this.debugWindow || this.debugWindow.isDestroyed()) {
        this.createDebugWindow();
      } else if (this.debugWindow.isVisible()) {
        this.debugWindow.focus();
        this.debugWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          this.debugWindow?.setAlwaysOnTop(false);
        }, 1e3);
      } else {
        this.debugWindow.show();
        this.debugWindow.focus();
      }
    } catch (error) {
      console.error("调试窗口操作失败:", error);
    }
  }
  /**
   * 发送日志到调试窗口
   */
  sendLogToDebugWindow(level, message, source) {
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.webContents.send("debug-log", {
        level,
        message,
        source,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  }
  /**
   * 创建调试窗口
   */
  createDebugWindow() {
    try {
      this.debugWindow = new electron.BrowserWindow({
        width: this.DEBUG_WIDTH,
        height: this.DEBUG_HEIGHT,
        minWidth: 600,
        minHeight: 400,
        title: "TellYou - 主进程调试",
        icon: path.join(__dirname, "../../shared/resources/icon.png"),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "../preload/index.js")
        },
        show: false,
        // 先不显示，等加载完成后再显示
        autoHideMenuBar: true,
        titleBarStyle: "default"
      });
      const isDev = process.env.NODE_ENV === "development";
      if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
        this.debugWindow.loadURL(
          `${process.env["ELECTRON_RENDERER_URL"]}#/debug`
        );
      } else if (isDev) {
        this.debugWindow.loadURL("http://localhost:5173/#/debug").catch(() => {
          console.warn("开发服务器连接失败，使用文件加载方式");
          this.debugWindow?.loadFile(
            path.join(__dirname, "../renderer/index.html"),
            {
              hash: "debug"
            }
          );
        });
      } else {
        this.debugWindow.loadFile(
          path.join(__dirname, "../renderer/index.html"),
          {
            hash: "debug"
          }
        );
      }
      this.debugWindow.once("ready-to-show", () => {
        this.debugWindow?.show();
        this.debugWindow?.focus();
        console.log("调试窗口创建成功");
      });
      this.debugWindow.on("closed", () => {
        this.debugWindow = null;
        console.log("调试窗口已关闭");
      });
      if (isDev) {
        this.debugWindow.webContents.openDevTools();
      }
    } catch (error) {
      console.error("创建调试窗口失败:", error);
    }
  }
}
const deviceService = new DeviceService();
class VoiceCache {
  beginServe() {
    electron.ipcMain.handle(
      "voice:cache:get:original",
      async (event, params) => {
        try {
          const data = await messageDao.getExtendData(
            params
          );
          if (data.originalLocalPath && urlUtil.existLocalFile(data.originalLocalPath)) {
            return urlUtil.signByApp("voice", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("voice");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const voicePath = todayDir + "/" + fileName;
          const voiceArrayBuffer = await netMinIO.downloadAudioWithProgress(
            data.originalPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "voice",
                  ...progress
                });
              },
              timeout: 3e4
            }
          );
          const voiceBuffer = Buffer.from(voiceArrayBuffer);
          fs.writeFileSync(voicePath, voiceBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: voicePath
          });
          return urlUtil.signByApp("voice", voicePath);
        } catch (error) {
          console.error("下载语音失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "voice",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }
}
const voiceCache = new VoiceCache();
class ImageCache {
  beginServe() {
    electron.ipcMain.handle(
      "image:cache:get:original",
      async (event, params) => {
        try {
          const data = await messageDao.getExtendData(
            params
          );
          if (data.originalLocalPath && urlUtil.existLocalFile(data.originalLocalPath)) {
            return urlUtil.signByApp("picture", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const imagePath = todayDir + "/" + fileName;
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.originalPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "image",
                  ...progress
                });
              },
              timeout: 3e4
            }
          );
          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: imagePath
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载原始图片失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "image",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
    electron.ipcMain.handle(
      "image:cache:get:thumbnail",
      async (event, params) => {
        try {
          log.info("image:cache:get:thumbnail开始下载", params);
          const data = await messageDao.getExtendData(
            params
          );
          if (data.thumbnailLocalPath && urlUtil.existLocalFile(data.thumbnailLocalPath)) {
            return urlUtil.signByApp("picture", data.thumbnailLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.thumbnailPath)}`;
          const imagePath = todayDir + "/" + fileName;
          log.info("image:cache:get:thumbnail:下载路径", imagePath);
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.thumbnailPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "thumbnail",
                  mediaType: "image",
                  ...progress
                });
              },
              timeout: 3e4
            }
          );
          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            thumbnailLocalPath: imagePath
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载缩略图失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "thumbnail",
            mediaType: "image",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }
}
const imageCache = new ImageCache();
class VideoCache {
  beginServe() {
    electron.ipcMain.handle(
      "video:cache:get:original",
      async (event, params) => {
        try {
          const data = await messageDao.getExtendData(
            params
          );
          if (data.originalLocalPath && urlUtil.existLocalFile(data.originalLocalPath)) {
            return urlUtil.signByApp("video", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("video");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const videoPath = todayDir + "/" + fileName;
          const videoArrayBuffer = await netMinIO.downloadVideoWithProgress(
            data.originalPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "video",
                  ...progress
                });
              },
              timeout: 6e4
            }
          );
          log.info("video:cache:get:original:下载成功");
          const videoBuffer = Buffer.from(videoArrayBuffer);
          fs.writeFileSync(videoPath, videoBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: videoPath
          });
          return urlUtil.signByApp("video", videoPath);
        } catch (error) {
          console.error("下载原始视频失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "video",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
    electron.ipcMain.handle(
      "video:cache:get:thumbnail",
      async (event, params) => {
        try {
          const data = await messageDao.getExtendData(
            params
          );
          if (data.thumbnailLocalPath && urlUtil.existLocalFile(data.thumbnailLocalPath)) {
            return urlUtil.signByApp("picture", data.thumbnailLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("picture");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.thumbnailPath)}`;
          const imagePath = todayDir + "/" + fileName;
          const imageArrayBuffer = await netMinIO.downloadImageWithProgress(
            data.thumbnailPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "thumbnail",
                  mediaType: "video",
                  ...progress
                });
              },
              timeout: 3e4
            }
          );
          log.info("video:cache:get:thumbnail:下载成功");
          const imageBuffer = Buffer.from(imageArrayBuffer);
          fs.writeFileSync(imagePath, imageBuffer);
          await messageDao.updateLocalPath(params.id, {
            thumbnailLocalPath: imagePath
          });
          return urlUtil.signByApp("picture", imagePath);
        } catch (error) {
          console.error("下载视频缩略图失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "thumbnail",
            mediaType: "video",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }
}
const videoCache = new VideoCache();
class FileCache {
  beginServe() {
    electron.ipcMain.handle(
      "file:cache:get:original",
      async (event, params) => {
        try {
          const data = await messageDao.getExtendData(
            params
          );
          if (data.originalLocalPath && urlUtil.existLocalFile(data.originalLocalPath)) {
            return urlUtil.signByApp("file", data.originalLocalPath);
          }
          const todayDir = urlUtil.ensureTodayDir("file");
          const fileName = `${params.id}_${Date.now()}${urlUtil.extractExt(data.originalPath)}`;
          const filePath = todayDir + "/" + fileName;
          const fileArrayBuffer = await netMinIO.downloadFileWithProgress(
            data.originalPath,
            {
              onProgress: (progress) => {
                event.sender.send("media:download:progress", {
                  messageId: params.id,
                  type: "original",
                  mediaType: "file",
                  ...progress
                });
              },
              timeout: 6e4
            }
          );
          const fileBuffer = Buffer.from(fileArrayBuffer);
          fs.writeFileSync(filePath, fileBuffer);
          await messageDao.updateLocalPath(params.id, {
            originalLocalPath: filePath
          });
          return urlUtil.signByApp("file", filePath);
        } catch (error) {
          console.error("下载文件失败:", error);
          event.sender.send("media:download:error", {
            messageId: params.id,
            type: "original",
            mediaType: "file",
            error: error instanceof Error ? error.message : String(error)
          });
          throw error;
        }
      }
    );
  }
}
const fileCache = new FileCache();
class ProfileDao {
  /**
   * 根据targetId和contactType查询Profile
   */
  async selectProfile(targetId, contactType) {
    try {
      const sql = `
        SELECT * FROM profiles 
        WHERE target_id = ? AND contact_type = ?
      `;
      const row = await queryOne(sql, [targetId, contactType]);
      if (!row) return null;
      return row;
    } catch (error) {
      log.error("ProfileDao:selectProfile error:", error);
      return null;
    }
  }
  /**
   * 插入新的Profile记录
   */
  async insertProfile(profile) {
    try {
      const now = Date.now();
      const profileData = {
        targetId: profile.targetId,
        contactType: profile.contactType,
        nickname: profile.nickname || null,
        nickVersion: profile.nickVersion || "0",
        avatarVersion: profile.avatarVersion || "0",
        avatarOriginalPath: profile.avatarOriginalPath || null,
        avatarThumbPath: profile.avatarThumbPath || null,
        lastNickUpdate: profile.lastNickUpdate || now,
        lastAvatarUpdate: profile.lastAvatarUpdate || now,
        createdAt: profile.createdAt || now
      };
      const result = await insertOrReplace("profiles", profileData);
      log.info(`ProfileDao: 插入Profile成功 ${profile.targetId}`);
      return result;
    } catch (error) {
      log.error("ProfileDao:insertProfile error:", error);
      return 0;
    }
  }
  /**
   * 更新昵称信息
   */
  async updateNickname(targetId, contactType, data) {
    try {
      const now = Date.now();
      const updateData = {
        nickname: data.nickname,
        nickVersion: data.nickVersion,
        lastNickUpdate: now
      };
      const whereData = { targetId, contactType };
      const result = await update("profiles", updateData, whereData);
      log.info(`ProfileDao: 昵称更新成功 ${targetId}: ${data.nickname}`);
      return result;
    } catch (error) {
      log.error("ProfileDao:updateNickname error:", error);
      return 0;
    }
  }
  /**
   * 更新头像信息
   */
  async updateAvatar(targetId, contactType, data) {
    try {
      const now = Date.now();
      const updateData = {
        avatarVersion: data.version,
        lastAvatarUpdate: now
      };
      if (data.strategy === "thumbedAvatarUrl") {
        updateData.avatarThumbPath = data.localPath;
      } else {
        updateData.avatarOriginalPath = data.localPath;
      }
      const whereData = { targetId, contactType };
      const result = await update("profiles", updateData, whereData);
      log.info(`ProfileDao: 头像更新成功 ${targetId}: ${data.localPath}`);
      return result;
    } catch (error) {
      log.error("ProfileDao:updateAvatar error:", error);
      return 0;
    }
  }
  /**
   * 插入或更新Profile (UPSERT操作)
   */
  async upsertProfile(profile) {
    try {
      const existing = await this.selectProfile(profile.targetId, profile.contactType);
      if (existing) {
        return await this.updateProfilePartial(profile.targetId, profile.contactType, profile);
      } else {
        return await this.insertProfile(profile);
      }
    } catch (error) {
      log.error("ProfileDao:upsertProfile error:", error);
      return 0;
    }
  }
  /**
   * 插入或替换昵称信息 (专用于昵称更新)
   */
  async upsertNickname(targetId, contactType, data) {
    try {
      const now = Date.now();
      const profileData = {
        targetId,
        contactType,
        nickname: data.nickname,
        nickVersion: data.nickVersion,
        lastNickUpdate: now,
        createdAt: now
      };
      const result = await insertOrReplace("profiles", profileData);
      log.info(`ProfileDao: 昵称upsert成功 ${targetId}: ${data.nickname}`);
      return result;
    } catch (error) {
      log.error("ProfileDao:upsertNickname error:", error);
      return 0;
    }
  }
  /**
   * 插入或更新头像信息 (专用于头像更新)
   */
  async upsertAvatar(targetId, contactType, data) {
    try {
      const existing = await this.selectProfile(targetId, contactType);
      const now = Date.now();
      if (existing) {
        return await this.updateAvatar(targetId, contactType, data);
      } else {
        const profileData = {
          targetId,
          contactType,
          avatarVersion: data.version,
          lastAvatarUpdate: now,
          createdAt: now
        };
        if (data.strategy === "thumbedAvatarUrl") {
          profileData.avatarThumbPath = data.localPath;
        } else {
          profileData.avatarOriginalPath = data.localPath;
        }
        const result = await insertOrReplace("profiles", profileData);
        log.info(`ProfileDao: 头像insert成功 ${targetId}: ${data.localPath}`);
        return result;
      }
    } catch (error) {
      log.error("ProfileDao:upsertAvatar error:", error);
      return 0;
    }
  }
  /**
   * 部分更新Profile字段
   */
  async updateProfilePartial(targetId, contactType, updates) {
    try {
      const updateData = {};
      if (updates.nickname !== void 0) updateData.nickname = updates.nickname;
      if (updates.nickVersion !== void 0) updateData.nickVersion = updates.nickVersion;
      if (updates.avatarVersion !== void 0) updateData.avatarVersion = updates.avatarVersion;
      if (updates.avatarOriginalPath !== void 0) updateData.avatarOriginalPath = updates.avatarOriginalPath;
      if (updates.avatarThumbPath !== void 0) updateData.avatarThumbPath = updates.avatarThumbPath;
      if (updates.lastNickUpdate !== void 0) updateData.lastNickUpdate = updates.lastNickUpdate;
      if (updates.lastAvatarUpdate !== void 0) updateData.lastAvatarUpdate = updates.lastAvatarUpdate;
      if (Object.keys(updateData).length === 0) {
        log.warn("ProfileDao:updateProfilePartial 没有字段需要更新");
        return 0;
      }
      const whereData = {
        targetId,
        contactType
      };
      const result = await update("profiles", updateData, whereData);
      log.info(`ProfileDao: 部分更新成功 ${targetId}`);
      return result;
    } catch (error) {
      log.error("ProfileDao:updateProfilePartial error:", error);
      return 0;
    }
  }
  /**
   * 批量查询多个Profile
   */
  async selectProfiles(targets) {
    if (targets.length === 0) return [];
    try {
      const conditions = targets.map(() => "(target_id = ? AND contact_type = ?)").join(" OR ");
      const params = targets.flatMap((t) => [t.targetId, t.contactType]);
      const sql = `SELECT * FROM profiles WHERE ${conditions}`;
      const rows = await queryAll(sql, params);
      if (!rows || rows.length === 0) return [];
      return rows;
    } catch (error) {
      log.error("ProfileDao:selectProfiles error:", error);
      return [];
    }
  }
}
const profileDao = new ProfileDao();
class ProfileService {
  memoryCache = /* @__PURE__ */ new Map();
  inflightRequests = /* @__PURE__ */ new Map();
  CACHE_DURATION = 2 * 60 * 1e3;
  // 2 分钟请求防抖
  MEMORY_TTL = 8 * 1e3;
  // 8 秒内存缓存
  beginServe() {
    electron.ipcMain.handle("profile:get-avatar-path", this.handleGetAvatarPath.bind(this));
    electron.ipcMain.handle("profile:get-nickname", this.handleGetNickname.bind(this));
    electron.ipcMain.handle("profile:trigger-update", this.handleTriggerUpdate.bind(this));
  }
  /**
   * 获取头像本地路径
   */
  async handleGetAvatarPath(_event, params) {
    try {
      const { targetId, strategy, contactType, version } = params;
      const profile = await this.getProfileFromDB(targetId, contactType);
      if (profile?.avatarVersion) {
        const currentVersion = parseInt(profile.avatarVersion);
        const requestVersion = parseInt(version);
        if (currentVersion >= requestVersion || profile?.lastAvatarUpdate > Date.now() - this.CACHE_DURATION) {
          const localPath = strategy === "thumbedAvatarUrl" ? profile.avatarThumbPath : profile.avatarOriginalPath;
          if (localPath && fs.existsSync(localPath)) {
            return { success: true, localPath: urlUtil.signByApp("avatar", localPath) };
          }
        }
      }
      await this.triggerAvatarUpdate(targetId, contactType, strategy);
      const updatedProfile = await this.getProfileFromDB(targetId, contactType);
      if (updatedProfile) {
        const localPath = strategy === "thumbedAvatarUrl" ? updatedProfile.avatarThumbPath : updatedProfile.avatarOriginalPath;
        if (localPath && fs.existsSync(localPath)) {
          return { success: true, localPath: urlUtil.signByApp("avatar", localPath) };
        }
      }
      return { success: false };
    } catch (error) {
      log.error("ProfileService:handleGetAvatarPath error:", error);
      return { success: false };
    }
  }
  /**
   * 获取昵称
   */
  async handleGetNickname(_event, params) {
    try {
      const { targetId, contactType, version } = params;
      let profile = await this.getProfileFromDB(targetId, contactType);
      if (profile?.nickVersion && profile?.nickname) {
        const currentVersion = parseInt(profile.nickVersion);
        const requestVersion = parseInt(version);
        if (currentVersion >= requestVersion || profile?.lastNickUpdate > Date.now() - this.CACHE_DURATION) {
          return profile.nickname;
        }
      }
      await this.triggerNicknameUpdate(targetId, contactType);
      profile = await this.getProfileFromDB(targetId, contactType);
      return profile?.nickname || "";
    } catch (error) {
      log.error("ProfileService:handleGetNickname error:", error);
      return "";
    }
  }
  /**
   * 触发Profile更新（后台更新，需要通知UI）
   */
  async handleTriggerUpdate(_event, params) {
    try {
      const { targetId, strategy, contactType } = params;
      const cacheKey = `${targetId}_${contactType}_${strategy}`;
      if (this.inflightRequests.has(cacheKey)) {
        await this.inflightRequests.get(cacheKey);
        return;
      }
      const promise = this.performProfileUpdate(targetId, contactType, strategy, true);
      this.inflightRequests.set(cacheKey, promise);
      try {
        await promise;
      } finally {
        this.inflightRequests.delete(cacheKey);
      }
    } catch (error) {
      log.error("ProfileService:handleTriggerUpdate error:", error);
    }
  }
  /**
   * 执行Profile更新
   */
  async performProfileUpdate(targetId, contactType, strategy, needNotify = false) {
    try {
      if (contactType === 1) {
        await this.updateUserProfile(targetId, strategy, needNotify);
      } else if (contactType === 2) {
        await this.updateGroupProfile(targetId, strategy, needNotify);
      }
    } catch (error) {
      log.error(`ProfileService: 更新失败 ${targetId}:`, error);
    }
  }
  /**
   * 更新用户Profile
   */
  async updateUserProfile(targetId, strategy, needNotify) {
    const metaJson = await this.getUserMetaJson(targetId);
    if (metaJson.nickname) {
      await this.updateNicknameInDB(targetId, 1, {
        nickname: metaJson.nickname,
        nickVersion: metaJson.nickVersion || "0"
      });
      if (needNotify) {
        this.notifyProfileUpdated(targetId, 1, "nickname", metaJson.nickname);
      }
    }
    const avatarUrl = metaJson[strategy];
    if (avatarUrl) {
      const filePath = await this.downloadAndSaveAvatar(targetId, 1, strategy, avatarUrl);
      if (needNotify && filePath) {
        this.notifyProfileUpdated(targetId, 1, strategy, urlUtil.signByApp("avatar", filePath));
      }
    }
  }
  /**
   * 更新群组Profile
   */
  async updateGroupProfile(targetId, strategy, needNotify) {
    const groupInfo = await this.getGroupInfo(targetId);
    log.info("ProfileService:updateGroupProfile", targetId, groupInfo);
    if (groupInfo.nickname) {
      await this.updateNicknameInDB(targetId, 2, {
        nickname: groupInfo.nickname,
        nickVersion: "1"
      });
      if (needNotify) {
        this.notifyProfileUpdated(targetId, 2, "nickname", groupInfo.nickname);
      }
    }
    if (groupInfo.avatar) {
      const filePath = await this.downloadAndSaveAvatar(targetId, 2, strategy, groupInfo.avatar);
      if (needNotify && filePath) {
        this.notifyProfileUpdated(targetId, 2, strategy, urlUtil.signByApp("avatar", filePath));
      }
    }
  }
  /**
   * 获取用户元信息JSON
   */
  async getUserMetaJson(userId) {
    const cacheKey = `user_meta_${userId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    const result = await netMinIO.downloadJson([urlUtil.atomPath, userId + ".json"].join("/"));
    this.memoryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    setTimeout(() => this.memoryCache.delete(cacheKey), this.MEMORY_TTL);
    return result;
  }
  /**
   * 获取群组信息
   */
  async getGroupInfo(groupId) {
    const cacheKey = `group_info_${groupId}`;
    const cached = this.memoryCache.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    try {
      log.info(`ProfileService:getGroupInfo: 获取群组信息 ${groupId}`);
      const response = await netMaster.post("/group/base-info-list", { targetList: [groupId] });
      const result = response.data;
      if (result.success && result.data && result.data.groupInfoList && result.data.groupInfoList.length > 0) {
        this.memoryCache.set(cacheKey, {
          data: result.data.groupInfoList[0],
          timestamp: Date.now()
        });
        setTimeout(() => this.memoryCache.delete(cacheKey), this.MEMORY_TTL);
        return result.data.groupInfoList[0];
      }
      return null;
    } catch (error) {
      log.error(`ProfileService:getGroupInfo: 获取群组信息失败 ${groupId}:`, error);
      return null;
    }
  }
  /**
   * 下载并保存头像
   */
  async downloadAndSaveAvatar(targetId, contactType, strategy, avatarUrl) {
    try {
      const version = this.extractVersionFromUrl(avatarUrl);
      const fileName = this.extractObjectFromUrl(avatarUrl);
      const filePath = path.join(urlUtil.cachePaths["avatar"], targetId + "_" + contactType, strategy, fileName);
      urlUtil.ensureDir(path.dirname(filePath));
      const arrayBuffer = await netMinIO.downloadAvatar(avatarUrl);
      if (arrayBuffer) {
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        await this.updateAvatarInDB(targetId, contactType, { strategy, version, localPath: filePath });
        log.info(`ProfileService: 头像下载成功 ${targetId} -> ${filePath}`);
        return filePath;
      }
    } catch (error) {
      log.error(`ProfileService: 头像下载失败 ${targetId}:`, error);
    }
    return "";
  }
  /**
   * 触发头像更新（主动请求路径，不需要通知）
   */
  async triggerAvatarUpdate(targetId, contactType, strategy) {
    await this.performProfileUpdate(targetId, contactType, strategy, false);
  }
  /**
   * 触发昵称更新（主动请求路径，不需要通知）
   */
  async triggerNicknameUpdate(targetId, contactType) {
    await this.performProfileUpdate(targetId, contactType, "nickname", false);
  }
  /**
   * 从数据库获取Profile
   */
  async getProfileFromDB(targetId, contactType) {
    try {
      const profile = await profileDao.selectProfile(targetId, contactType);
      if (!profile) return null;
      return {
        targetId: profile.targetId,
        contactType: profile.contactType,
        nickname: profile.nickname || "",
        nickVersion: profile.nickVersion || "0",
        avatarVersion: profile.avatarVersion || "0",
        avatarOriginalPath: profile.avatarOriginalPath || "",
        avatarThumbPath: profile.avatarThumbPath || "",
        lastNickUpdate: profile.lastNickUpdate,
        lastAvatarUpdate: profile.lastAvatarUpdate,
        createdAt: profile.createdAt
      };
    } catch (error) {
      log.error("ProfileService:getProfileFromDB error:", error);
      return null;
    }
  }
  /**
   * 更新数据库中的昵称信息
   */
  async updateNicknameInDB(targetId, contactType, data) {
    try {
      await profileDao.upsertNickname(targetId, contactType, { nickname: data.nickname, nickVersion: data.nickVersion });
      log.info(`ProfileService: 昵称更新成功 ${targetId}: ${data.nickname}`);
    } catch (error) {
      log.error("ProfileService:updateNicknameInDB error:", error);
    }
  }
  /**
   * 更新数据库中的头像信息
   */
  async updateAvatarInDB(targetId, contactType, data) {
    try {
      const { strategy, version, localPath } = data;
      await profileDao.upsertAvatar(targetId, contactType, { strategy, version, localPath });
      log.info(`ProfileService: 头像路径更新成功 ${targetId}: ${localPath}`);
    } catch (error) {
      log.error("ProfileService:updateAvatarInDB error:", error);
    }
  }
  /**
   * 通知渲染进程Profile已更新
   */
  notifyProfileUpdated(targetId, contactType, strategy, metaInfo) {
    try {
      const window = electron.BrowserWindow.getAllWindows().at(0);
      if (window) {
        window.webContents.send("profile-updated", {
          targetId,
          contactType,
          strategy,
          metaInfo
        });
      }
      log.info(`ProfileService: 通知UI更新 ${targetId}_${contactType}_${strategy}: ${metaInfo}`);
    } catch (error) {
      log.error("ProfileService:notifyProfileUpdated error:", error);
    }
  }
  /**
   * 从URL提取版本号
   */
  extractVersionFromUrl(url) {
    try {
      return new URL(url).pathname.split("/").at(-2) || "0";
    } catch {
      return "0";
    }
  }
  /**
   * 从URL提取文件名
   */
  extractObjectFromUrl(url) {
    try {
      return new URL(url).pathname.split("/").at(-1) || "avatar.png";
    } catch {
      return "avatar.png";
    }
  }
}
const profileService = new ProfileService();
const Store = __Store.default || __Store;
log.transports.file.level = "debug";
log.transports.file.maxSize = 1002430;
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
log.transports.file.resolvePathFn = () => path.join(os.homedir(), ".tellyou", "logs", "main.log");
const originalLogMethods = {
  log: log.log,
  warn: log.warn,
  error: log.error,
  info: log.info,
  debug: log.debug
};
console.log = (...args) => {
  originalLogMethods.log(...args);
  deviceService.sendLogToDebugWindow("info", args.join(" "), "MainProcess");
};
console.warn = (...args) => {
  originalLogMethods.warn(...args);
  deviceService.sendLogToDebugWindow("warn", args.join(" "), "MainProcess");
};
console.error = (...args) => {
  originalLogMethods.error(...args);
  deviceService.sendLogToDebugWindow("error", args.join(" "), "MainProcess");
};
console.info = (...args) => {
  originalLogMethods.info(...args);
  deviceService.sendLogToDebugWindow("info", args.join(" "), "MainProcess");
};
console.debug = (...args) => {
  originalLogMethods.debug(...args);
  deviceService.sendLogToDebugWindow("debug", args.join(" "), "MainProcess");
};
log.log = (...args) => {
  originalLogMethods.log(...args);
  deviceService.sendLogToDebugWindow("info", args.join(" "), "MainProcess");
};
log.warn = (...args) => {
  originalLogMethods.warn(...args);
  deviceService.sendLogToDebugWindow("warn", args.join(" "), "MainProcess");
};
log.error = (...args) => {
  originalLogMethods.error(...args);
  deviceService.sendLogToDebugWindow("error", args.join(" "), "MainProcess");
};
log.info = (...args) => {
  originalLogMethods.info(...args);
  deviceService.sendLogToDebugWindow("info", args.join(" "), "MainProcess");
};
log.debug = (...args) => {
  originalLogMethods.debug(...args);
  deviceService.sendLogToDebugWindow("debug", args.join(" "), "MainProcess");
};
electron.app.setPath("userData", electron.app.getPath("userData") + "_" + urlUtil.instanceId);
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "tellyou",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);
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
const createWindow = () => {
  const mainWindow = new electron.BrowserWindow({
    icon,
    width: deviceService.LOGIN_WIDTH,
    height: deviceService.LOGIN_HEIGHT,
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
  voiceCache.beginServe();
  imageCache.beginServe();
  videoCache.beginServe();
  fileCache.beginServe();
  profileService.beginServe();
  mediaTaskService.beginServe();
  jsonStoreService.beginServe();
  sessionService.beginServe();
  messageService.beginServe();
  applicationService.beginServe();
  blackService.beginServer();
  deviceService.beginServe(mainWindow);
  mainWindow.on("ready-to-show", () => {
    mainWindow.setResizable(false);
    mainWindow.setMaximizable(false);
    mainWindow.show();
    mainWindow.center();
    if (utils.is.dev) {
      mainWindow.webContents.openDevTools({
        mode: "detach",
        title: "devTool",
        activate: false
      });
      mainWindow.focus();
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              "default-src * 'unsafe-eval' 'unsafe-inline' data: blob: file:"
            ]
          }
        });
      }
    );
  }
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]).then();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html")).then();
  }
};
exports.store = store;
