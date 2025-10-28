import { wsConfigInit } from "@main/websocket/client";
import atomDao from "@main/sqlite/dao/atom-dao";
import { BrowserWindow, ipcMain, app, shell } from "electron";
import { test } from "@main/test";
import fs from "fs";
import path from "path";
import { mediaUtil } from "@main/util/media-util";

/**
 * 负责监听渲染进程对窗口的变化、请求和关闭窗口等桌面端操作及下游事件
 * @author lanye
 * @date 2025/10/12 15:59
 */

class DeviceService {
  public readonly LOGIN_WIDTH: number = 440;
  public readonly LOGIN_HEIGHT: number = 350;
  public readonly REGISTER_WIDTH: number = 440;
  public readonly REGISTER_HEIGHT: number = 600;
  public readonly MAIN_WIDTH: number = 800;
  public readonly MAIN_HEIGHT: number = 660;
  public readonly DEBUG_WIDTH: number = 800;
  public readonly DEBUG_HEIGHT: number = 600;

  private debugWindow: Electron.BrowserWindow | null = null;

  public beginServe(mainWindow: Electron.BrowserWindow): void {
    ipcMain.handle(
      "device:login-or-register",
      async (_, goRegister: boolean) => {
        // Ensure window cannot be maximized or resized on login/register screens
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
      },
    );
    ipcMain.on("LoginSuccess", (_, userId: string) => {
      wsConfigInit();
      atomDao.initializeUserData(userId).then(() => {
        // 先发送ws-connected让路由跳转
        mainWindow.webContents.send("ws-connected");

        // 延迟后平滑改变窗口大小
        setTimeout(() => {
          this.smoothResizeWindow(mainWindow, 920, 740);
        }, 3000); // 等待路由跳转完成
      });
    });
    // 监听Main.vue初始化完成事件，转发给渲染进程
    ipcMain.on("main-initialized", () => {
      console.log("收到Main.vue初始化完成信号，转发给LoginView");
      mainWindow.webContents.send("main-initialized");
    });

    // 监听调试窗口切换事件
    ipcMain.on("debug-window-toggle", () => {
      this.toggleDebugWindow();
    });
    ipcMain.on("window-ChangeScreen", (event, status: number) => {
      const webContents = event.sender;
      const win = BrowserWindow.fromWebContents(webContents);

      // if (!win?.isResizable() && status === 1 || status === 2) return

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
    ipcMain.handle("device:select-file", async () => {
      try {
        const { dialog } = await import("electron");
        const result = await dialog.showOpenDialog({
          title: "选择头像文件",
          filters: [
            {
              name: "图片文件",
              extensions: ["png", "jpg", "jpeg", "gif", "webp"],
            },
          ],
          properties: ["openFile"],
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
          dataUrl,
        };
      } catch (error) {
        console.error("Failed to select avatar file:", error);
        throw error;
      }
    });
    // 获取音频流 - 使用Electron原生API替代浏览器API
    ipcMain.handle("device:get-audio-stream", async (_, constraints) => {
      try {
        console.log("开始获取音频流，约束条件:", constraints);
        // 返回音频约束配置，让渲染进程使用getUserMedia
        // 针对语音通话优化，减少文件大小
        return {
          success: true,
          constraints: {
            audio: {
              echoCancellation: constraints?.audio?.echoCancellation ?? true,
              noiseSuppression: constraints?.audio?.noiseSuppression ?? true,
              autoGainControl: constraints?.audio?.autoGainControl ?? true,
              // 优化音频参数以减少文件大小
              sampleRate: constraints?.audio?.sampleRate ?? 16000, // 降低到16kHz（语音质量足够）
              channelCount: constraints?.audio?.channelCount ?? 1, // 单声道
              sampleSize: constraints?.audio?.sampleSize ?? 16, // 16位采样
              // 添加比特率限制（如果浏览器支持）
              bitrate: constraints?.audio?.bitrate ?? 32000, // 32kbps比特率
              // 音频编码优化
              latency: 0.01, // 低延迟
              volume: 1.0, // 音量
            },
          },
          // 提供特殊标识，表明这是通过Electron主进程验证的
          electronVerified: true,
          // 添加录音建议配置
          recordingOptions: {
            mimeType: "audio/webm;codecs=opus", // 使用Opus编解码器
            audioBitsPerSecond: 128000, // 32kbps比特率
          },
        };
      } catch (error) {
        console.error("获取音频流失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };
      }
    });

    // 获取文件预览图
    ipcMain.handle("file:get-preview-image", async (_, fileSuffix: string) => {
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
          "go",
        ];
        console.log("获取文件预览图:", ext);
        const appPath = app.getAppPath();
        const getBasePath = () => {
          if (app.isPackaged) {
            return path.join(
              process.resourcesPath,
              "shared",
              "resources",
              "file-preview",
            );
          } else {
            return path.join(
              appPath,
              "src",
              "shared",
              "resources",
              "file-preview",
            );
          }
        };
        const basePath = getBasePath();
        const fileName = supportedTypes.includes(ext)
          ? `${ext}.avif`
          : "no-supported.png";
        let previewImagePath = path.join(basePath, fileName);
        console.log("预览图路径:", previewImagePath);
        // 检查文件是否存在
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
        let mimeType = "image/png"; // 默认
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
          "bytes",
        );
        return {
          success: true,
          data: imageBuffer,
          mimeType: mimeType,
          size: imageBuffer.length,
        };
      } catch (error) {
        console.error("获取文件预览图失败:", error);
        return null;
      }
    });

    // 在文件管理器中显示文件
    ipcMain.handle("file:show-in-folder", async (_, filePath: string) => {
      try {
        const url = new URL(filePath);
        const localPath = path.resolve(url.searchParams.get("path") || "");
        console.log("显示文件位置:", localPath);
        if (!fs.existsSync(path.resolve(localPath))) {
          throw new Error(`文件不存在: ${localPath}`);
        }
        shell.showItemInFolder(path.resolve(localPath));
        return { success: true };
      } catch (error) {
        console.error("显示文件位置失败:", error);
        return { success: false, error: error.message };
      }
    });

    // 处理音频文件转blob的请求
    ipcMain.handle("voice:convert-to-blob", async (_, filePath: string) => {
      try {
        console.log("转换音频文件为blob:", filePath);

        let localPath = filePath;

        // 处理 tellyou:// 协议转换
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
        let mimeType = "audio/mpeg"; // 默认

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
          size: fileBuffer.length,
        };
      } catch (error) {
        console.error("音频文件转blob失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // 处理视频文件转blob的请求
    ipcMain.handle("video:convert-to-blob", async (_, filePath: string) => {
      try {
        console.log("转换视频文件为blob:", filePath);
        if (!fs.existsSync(filePath)) {
          throw new Error(`文件不存在: ${filePath}`);
        }
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = "video/mp4"; // 默认

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
          size: fileBuffer.length,
        };
      } catch (error) {
        console.error("视频文件转blob失败:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    ipcMain.handle("test", (_, data: any) => {
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
  private smoothResizeWindow(
    window: Electron.BrowserWindow,
    targetWidth: number,
    targetHeight: number,
    duration: number = 300,
  ): void {
    const currentBounds = window.getBounds();
    const startWidth = currentBounds.width;
    const startHeight = currentBounds.height;
    const startX = currentBounds.x;
    const startY = currentBounds.y;

    // 计算目标位置(居中)
    const targetX = startX + (startWidth - targetWidth) / 2;
    const targetY = startY + (startHeight - targetHeight) / 2;

    const startTime = Date.now();

    // 缓动函数 (ease-out)
    const easeOut = (t: number): number => {
      return 1 - Math.pow(1 - t, 3);
    };

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      const currentWidth = Math.round(
        startWidth + (targetWidth - startWidth) * easedProgress,
      );
      const currentHeight = Math.round(
        startHeight + (targetHeight - startHeight) * easedProgress,
      );
      const currentX = Math.round(startX + (targetX - startX) * easedProgress);
      const currentY = Math.round(startY + (targetY - startY) * easedProgress);

      window.setBounds({
        x: currentX,
        y: currentY,
        width: currentWidth,
        height: currentHeight,
      });

      if (progress < 1) {
        // 使用 setImmediate 而不是 requestAnimationFrame，因为这是在主进程
        setImmediate(animate);
      } else {
        // 动画完成后设置窗口属性
        window.setResizable(true);
        window.setMaximizable(true);
        window.setMinimumSize(this.MAIN_WIDTH, this.MAIN_HEIGHT);
        console.log("窗口平滑缩放完成");
      }
    };

    // 开始动画前先设置为可缩放
    window.setResizable(true);
    animate();
  }

  /**
   * 切换调试窗口显示状态
   */
  private toggleDebugWindow(): void {
    try {
      if (!this.debugWindow || this.debugWindow.isDestroyed()) {
        // 创建新的调试窗口
        this.createDebugWindow();
      } else if (this.debugWindow.isVisible()) {
        // 如果窗口已显示，则置顶
        this.debugWindow.focus();
        this.debugWindow.setAlwaysOnTop(true);
        setTimeout(() => {
          this.debugWindow?.setAlwaysOnTop(false);
        }, 1000); // 1秒后取消置顶
      } else {
        // 如果窗口隐藏，则显示并置顶
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
  public sendLogToDebugWindow(
    level: string,
    message: string,
    source: string,
  ): void {
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.webContents.send("debug-log", {
        level,
        message,
        source,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 创建调试窗口
   */
  private createDebugWindow(): void {
    try {
      this.debugWindow = new BrowserWindow({
        width: this.DEBUG_WIDTH,
        height: this.DEBUG_HEIGHT,
        minWidth: 600,
        minHeight: 400,
        title: "TellYou - 主进程调试",
        icon: path.join(__dirname, "../../shared/resources/icon.png"),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "../preload/index.js"),
        },
        show: false, // 先不显示，等加载完成后再显示
        autoHideMenuBar: true,
        titleBarStyle: "default",
      });

      // 加载调试页面
      const isDev = process.env.NODE_ENV === "development";
      if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
        // 使用开发环境的URL
        this.debugWindow.loadURL(
          `${process.env["ELECTRON_RENDERER_URL"]}#/debug`,
        );
      } else if (isDev) {
        // 开发环境但没有ELECTRON_RENDERER_URL，尝试默认端口
        this.debugWindow.loadURL("http://localhost:5173/#/debug").catch(() => {
          // 如果加载失败，降级到文件加载
          console.warn("开发服务器连接失败，使用文件加载方式");
          this.debugWindow?.loadFile(
            path.join(__dirname, "../renderer/index.html"),
            {
              hash: "debug",
            },
          );
        });
      } else {
        // 生产环境使用文件加载
        this.debugWindow.loadFile(
          path.join(__dirname, "../renderer/index.html"),
          {
            hash: "debug",
          },
        );
      }

      // 窗口准备好后显示
      this.debugWindow.once("ready-to-show", () => {
        this.debugWindow?.show();
        this.debugWindow?.focus();
        console.log("调试窗口创建成功");
      });

      // 窗口关闭时清理引用
      this.debugWindow.on("closed", () => {
        this.debugWindow = null;
        console.log("调试窗口已关闭");
      });

      // 开发环境下打开开发者工具
      if (isDev) {
        this.debugWindow.webContents.openDevTools();
      }
    } catch (error) {
      console.error("创建调试窗口失败:", error);
    }
  }
}

export const deviceService = new DeviceService();
