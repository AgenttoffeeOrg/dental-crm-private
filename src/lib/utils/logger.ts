// Centralized logging utility

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  metadata?: any
}

class Logger {
  private logs: LogEntry[] = []

  private log(level: LogLevel, message: string, metadata?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata
    }

    this.logs.push(entry)

    if (process.env.NODE_ENV === 'development') {
      console[level === 'debug' ? 'log' : level](
        `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
        metadata
      )
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      // Send to Sentry, Datadog, etc.
    }
  }

  info(message: string, metadata?: any) {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: any) {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: any) {
    this.log('error', message, metadata)
  }

  debug(message: string, metadata?: any) {
    this.log('debug', message, metadata)
  }

  getLogs() {
    return this.logs
  }

  clearLogs() {
    this.logs = []
  }
}

export const logger = new Logger()


