type LogLevel = "debug" | "info" | "warn" | "error"

const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

export type StructuredLogger = {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

export const createStructuredLogger = (
  service: string,
  minLevel: LogLevel = "info",
): StructuredLogger => {
  const write = (level: LogLevel, message: string, meta: Record<string, unknown> = {}) => {
    if (levelOrder[level] < levelOrder[minLevel]) return
    const entry = { timestamp: new Date().toISOString(), level, service, message, ...meta }
    const line = JSON.stringify(entry)
    if (level === "error") console.error(line)
    else if (level === "warn") console.warn(line)
    else console.log(line)
  }

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  }
}
