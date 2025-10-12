import path, { join } from 'path'
import { app, protocol } from 'electron'
import fs, { existsSync, mkdirSync } from 'fs'
import os from 'os'

class UrlUtil {
  public readonly protocolHost: string[] = ['avatar', 'picture', 'voice', 'video', 'file']
  public readonly mimeByExt: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  }

  public nodeEnv = process.env.NODE_ENV || 'production'
  public homeDir = os.homedir()
  public appPath = join(this.homeDir, this.nodeEnv === 'development' ? '.tellyoudev' : '.tellyou')
  public tempPath: string = join(this.appPath, 'temp')
  public sqlPath = this.appPath
  public atomPath = import.meta.env.VITE_REQUEST_OBJECT_ATOM || ''
  public instanceId = (process.env.ELECTRON_INSTANCE_ID as string) || ''

  public cacheRootPath = ''
  public cachePaths: Record<string, string> = {
    avatar: '',
    picture: '',
    voice: '',
    video: '',
    file: ''
  }
  // 保证目录存在
  public ensureDir(path: string): void {
    if (!existsSync(path)) {
      console.info('url-util:ensure-dir:', path)
      mkdirSync(path, { recursive: true })
    }
  }
  public init(): void {
    this.cacheRootPath = join(app.getPath('userData'), 'caching')
    this.tempPath = join(app.getPath('userData'), 'temp')
    this.protocolHost.forEach((host) => {
      this.cachePaths[host] = join(this.cacheRootPath, host)
      this.ensureDir(this.cachePaths[host])
    })
  }
  // 注册本地文件访问协议
  public registerProtocol(): void {
    protocol.handle('tellyou', async (request) => {
      try {
        const url = new URL(request.url)

        if (!this.protocolHost.includes(url.hostname)) return new Response('', { status: 403 })

        const filePath = decodeURIComponent(url.searchParams.get('path') || '')
        const normalized = path.resolve(filePath)
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

        const ext = path.extname(normalized).toLowerCase()
        const mime = this.mimeByExt[ext] || 'application/octet-stream'
        const data = await fs.promises.readFile(normalized)
        return new Response(data, {
          headers: { 'content-type': mime, 'Access-Control-Allow-Origin': '*' }
        })
      } catch (e) {
        console.error('tellyou protocol error:', e)
        return new Response('', { status: 500 })
      }
    })
  }
  // 资源定位符：重定向数据库目录
  public redirectSqlPath(userId: string): void {
    this.sqlPath = join(this.appPath, '_' + userId)
    console.info('数据库操作目录 ' + this.sqlPath)
    if (!fs.existsSync(this.sqlPath)) {
      fs.mkdirSync(this.sqlPath, { recursive: true })
    }
  }
  //  文件自定义协议签名
  public signByApp(path: string): string {
    return `tellyou://avatar?path=${encodeURIComponent(path)}`
  }
  public extractObjectName(url: string): string {
    return new URL(url).pathname.split('/').slice(2).join('/')
  }  // /lanye/avatar/original/1948031012053333361/6/index.png -> avatar/original/1948031012053333361/6/index.png
}

const urlUtil: UrlUtil = new UrlUtil()
export default urlUtil
