import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// 控制台颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private logDir: string
  private logFile: string
  private enableColors: boolean

  private constructor() {
    this.ensureConsoleEncoding()
    this.logLevel = LogLevel.INFO
    this.logDir = path.join(os.homedir(), '.tellyou', 'logs')
    this.logFile = path.join(this.logDir, `tellyou-${new Date().toISOString().split('T')[0]}.log`)
    this.enableColors = true

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private ensureConsoleEncoding(): void {
    if (process.platform === 'win32') {
      try {
        execSync('reg add HKEY_CURRENT_USER\\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f', { stdio: 'ignore' })
      } catch {

      }
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level
  }

  setEnableColors(enable: boolean): void {
    this.enableColors = enable
  }

  private colorize(text: string, color: string): string {
    return this.enableColors ? `${color}${text}${colors.reset}` : text
  }

  private getLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'debug': return colors.gray
      case 'info': return colors.green
      case 'warn': return colors.yellow
      case 'error': return colors.red
      case 'fatal': return colors.magenta
      default: return colors.white
    }
  }

  private formatTimestamp(): string {
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const time = now.toTimeString().split(' ')[0]
    return `${date} ${time}`
  }

  private writeLog(level: string, message: string, data?: any): void {
    if (this.logLevel > this.getLogLevel(level)) {
      return
    }

    const timestamp = this.formatTimestamp()
    const levelUpper = level.toUpperCase()
    const levelColor = this.getLevelColor(level)

    // 控制台输出（带颜色）
    const consoleMessage = `${this.colorize(`[${timestamp}]`, colors.cyan)} ${this.colorize(levelUpper.padEnd(5), levelColor)} ${message}`

    if (data) {
      console.log(consoleMessage, data)
    } else {
      console.log(consoleMessage)
    }

    // 文件输出（纯文本，无颜色代码）
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: levelUpper,
      message,
      data: data || null,
      pid: process.pid
    }

    const logLine = JSON.stringify(logEntry, null, 2) + '\n'

    try {
      fs.appendFileSync(this.logFile, logLine, 'utf8')
    } catch (error) {
      console.error('写入日志文件失败:', error)
    }
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'debug': return LogLevel.DEBUG
      case 'info': return LogLevel.INFO
      case 'warn': return LogLevel.WARN
      case 'error': return LogLevel.ERROR
      case 'fatal': return LogLevel.FATAL
      default: return LogLevel.INFO
    }
  }

  debug(message: string, data?: any): void {
    this.writeLog('debug', message, data)
  }

  info(message: string, data?: any): void {
    this.writeLog('info', message, data)
  }

  warn(message: string, data?: any): void {
    this.writeLog('warn', message, data)
  }

  error(message: string, error?: any): void {
    this.writeLog('error', message, error)
  }

  fatal(message: string, error?: any): void {
    this.writeLog('fatal', message, error)
  }

  // SQL查询专用日志
  sql(sql: string, params: any[], result?: any): void {
    const message = `SQL执行: ${sql}`
    const data = { params, result }
    this.writeLog('debug', message, data)
  }

  // 数据库操作专用日志
  db(operation: string, table: string, data?: any): void {
    const message = `数据库操作: ${operation} -> ${table}`
    this.writeLog('debug', message, data)
  }

  // 网络请求专用日志
  network(method: string, url: string, status?: number, data?: any): void {
    const message = `${method} ${url}${status ? ` (${status})` : ''}`
    this.writeLog('info', message, data)
  }

  getLogFilePath(): string {
    return this.logFile
  }

  cleanOldLogs(daysToKeep: number = 7): void {
    try {
      const files = fs.readdirSync(this.logDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      files.forEach(file => {
        const filePath = path.join(this.logDir, file)
        const stats = fs.statSync(filePath)

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath)
          this.info(`删除旧日志文件: ${file}`)
        }
      })
    } catch (error) {
      this.error('清理日志文件失败', error)
    }
  }
}

export const logger = Logger.getInstance()
