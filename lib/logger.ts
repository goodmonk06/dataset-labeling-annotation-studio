/**
 * Structured logging utility
 * Provides contextual logging with levels and metadata
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  requestId?: string
  userId?: string
  projectId?: string
  [key: string]: any
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export class Logger {
  constructor(
    private defaultContext: LogContext = {},
    private minLevel: LogLevel = LogLevel.INFO
  ) {}

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.defaultContext, ...context },
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    this.write(entry)
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.defaultContext, ...context },
    }

    this.write(entry)
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const minIndex = levels.indexOf(this.minLevel)
    const currentIndex = levels.indexOf(level)
    return currentIndex >= minIndex
  }

  private write(entry: LogEntry): void {
    // In production, you might send this to a logging service
    // For now, format and write to console

    const colorMap = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    }

    const reset = '\x1b[0m'
    const color = colorMap[entry.level]

    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} - ${entry.message}`,
      entry.context || {},
      entry.error || ''
    )
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(
      { ...this.defaultContext, ...context },
      this.minLevel
    )
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger(
  {},
  (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
)
