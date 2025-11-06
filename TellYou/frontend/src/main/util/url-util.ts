import path, { join } from "path";
import { app, protocol } from "electron";
import fs, { existsSync, mkdirSync } from "fs";
import os from "os";

/**
 * 资源管理映射工具类
 * @author lanye
 * @since 2025/10/26 04:09
 */

class UrlUtil {
  public readonly protocolHost: string[] = [
    "avatar",
    "picture",
    "voice",
    "video",
    "file",
  ];
  public readonly mimeByExt: Record<string, string> = {
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
    ".xml": "application/xml",
  };

  public nodeEnv = process.env.NODE_ENV || "production";
  public homeDir = os.homedir();
  public appPath = join(
    this.homeDir,
    this.nodeEnv === "development" ? ".tellyoudev" : ".tellyou",
  );
  public tempPath: string = join(this.appPath, "temp");
  public sqlPath = this.appPath;
  public atomPath = import.meta.env.VITE_REQUEST_OBJECT_ATOM || "";
  public instanceId = (process.env.ELECTRON_INSTANCE_ID as string) || "";

  public cacheRootPath = "";
  public cachePaths: Record<string, string> = {
    avatar: "",
    picture: "",
    voice: "",
    video: "",
    file: "",
  };
  // 保证目录存在
  public ensureDir(path: string): void {
    if (!existsSync(path)) {
      console.info("url-util:ensure-dir:", path);
      mkdirSync(path, { recursive: true });
    }
  }
  public init(): void {
    this.cacheRootPath = join(app.getPath("userData"), "caching");
    this.tempPath = join(app.getPath("userData"), "temp");
    this.protocolHost.forEach((host) => {
      this.cachePaths[host] = join(this.cacheRootPath, host)
      this.ensureDir(this.cachePaths[host])
    })
  }
  // 注册本地文件访问协议
  public registerProtocol(): void {
    protocol.handle("tellyou", async (request) => {
      try {
        const url = new URL(request.url);
        // if (url.hostname === 'picture'){
        // }
        if (!this.protocolHost.includes(url.hostname))
          return new Response("", { status: 403 });

        const filePath = decodeURIComponent(url.searchParams.get("path") || "");
        const normalized = path.resolve(filePath);
        // console.info('url-register', normalized)

        /*
                // 因为 dev 模式，会开多个 electron 实例，不同实例的缓存路径不同，这里判断先不写了
                const rootResolved = path.resolve(this.cacheRootPath)
                const hasAccess =
                  normalized.toLowerCase().startsWith((rootResolved + path.sep).toLowerCase()) ||
                  normalized.toLowerCase() === rootResolved.toLowerCase()

                if (!hasAccess) {
                  console.error('tellyou protocol denied:', { normalized, rootResolved })
                  return new Response('', { status: 403 })
                }
        */

        const ext = path.extname(normalized).toLowerCase();
        const mime = this.mimeByExt[ext] || "application/octet-stream";
        const data = await fs.promises.readFile(normalized);
        return new Response(data, {
          headers: { "content-type": mime, "Access-Control-Allow-Origin": "*" },
        });
      } catch (e) {
        console.error("tellyou protocol error:", e);
        return new Response("", { status: 500 });
      }
    });
  }
  // 资源定位符：重定向数据库目录
  public redirectSqlPath(userId: string): void {
    this.sqlPath = join(this.appPath, "_" + userId);
    console.info("数据库操作目录 " + this.sqlPath);
    if (!fs.existsSync(this.sqlPath)) {
      fs.mkdirSync(this.sqlPath, { recursive: true });
    }
  }
  //  文件自定义协议签名
  public signByApp(host: string, path: string): string {
    return `tellyou://${host}?path=${encodeURIComponent(path)}`;
  }
  // 从 URL 中提取对象名称
  public extractObjectName(url: string): string {
    return new URL(url).pathname.split("/").slice(2).join("/");
  } // /lanye/avatar/original/1948031012053333361/6/index.png -> avatar/original/1948031012053333361/6/index.png
  // 从 URL 中提取扩展名
  public extractExt(url: string): string {
    return path.extname(url);
  }
  // 检查文件是否存在
  public existLocalFile(url: string): boolean {
    const normalized = path.resolve(url);
    return existsSync(normalized);
  }
  // 确保今天目录存在
  public ensureTodayDir(host: string): string {
    const today = new Date().toISOString().split("T")[0];
    const todayPath = join(this.cachePaths[host], today);
    this.ensureDir(todayPath);
    return todayPath;
  }

  public generateFilePath(host: string, extName: string): string {
    const today = new Date().toISOString().split("T")[0]
    const todayPath = join(this.cachePaths[host], today)
    return todayPath + '/' + Date.now() + extName
  }
}

const urlUtil: UrlUtil = new UrlUtil();
export default urlUtil;
