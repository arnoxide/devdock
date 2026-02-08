import { EventEmitter } from 'node:events'
import { v4 as uuid } from 'uuid'
import { LogEntry, LogLevel, LogSource, LogFilter } from '../../shared/types'

const LOG_LEVEL_PATTERNS: [RegExp, LogLevel][] = [
  [/\b(fatal|FATAL)\b/, 'fatal'],
  [/\b(error|ERROR|ERR)\b/, 'error'],
  [/\b(warn|WARNING|WARN)\b/, 'warn'],
  [/\b(debug|DEBUG|DBG)\b/, 'debug']
]

export class LogCollector extends EventEmitter {
  private logs = new Map<string, LogEntry[]>() // projectId -> entries
  private maxEntries: number

  constructor(maxEntries: number = 5000) {
    super()
    this.maxEntries = maxEntries
  }

  addEntry(
    projectId: string,
    message: string,
    source: LogSource,
    level?: LogLevel,
    processName?: string
  ): LogEntry {
    const entry: LogEntry = {
      id: uuid(),
      projectId,
      source,
      level: level || this.detectLevel(message, source),
      message: message.trimEnd(),
      timestamp: new Date().toISOString(),
      processName
    }

    const entries = this.logs.get(projectId) || []
    entries.push(entry)

    // Circular buffer
    if (entries.length > this.maxEntries) {
      entries.shift()
    }
    this.logs.set(projectId, entries)

    this.emit('new-entry', entry)
    return entry
  }

  getEntries(projectId: string, filter?: LogFilter): LogEntry[] {
    let entries = this.logs.get(projectId) || []

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        entries = entries.filter((e) => filter.level!.includes(e.level))
      }
      if (filter.source && filter.source.length > 0) {
        entries = entries.filter((e) => filter.source!.includes(e.source))
      }
      if (filter.search) {
        const search = filter.search.toLowerCase()
        entries = entries.filter((e) => e.message.toLowerCase().includes(search))
      }
      if (filter.limit) {
        entries = entries.slice(-filter.limit)
      }
    }

    return entries
  }

  getAllEntries(filter?: LogFilter): LogEntry[] {
    let allEntries: LogEntry[] = []
    for (const entries of this.logs.values()) {
      allEntries = allEntries.concat(entries)
    }

    // Sort by timestamp
    allEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    if (filter) {
      if (filter.level && filter.level.length > 0) {
        allEntries = allEntries.filter((e) => filter.level!.includes(e.level))
      }
      if (filter.source && filter.source.length > 0) {
        allEntries = allEntries.filter((e) => filter.source!.includes(e.source))
      }
      if (filter.search) {
        const search = filter.search.toLowerCase()
        allEntries = allEntries.filter((e) => e.message.toLowerCase().includes(search))
      }
      if (filter.limit) {
        allEntries = allEntries.slice(-filter.limit)
      }
    }

    return allEntries
  }

  clear(projectId: string): void {
    this.logs.delete(projectId)
  }

  private detectLevel(message: string, source: LogSource): LogLevel {
    if (source === 'stderr') {
      // Check if it's actually an error or just a warning/info on stderr
      for (const [pattern, level] of LOG_LEVEL_PATTERNS) {
        if (pattern.test(message)) return level
      }
      return 'error'
    }

    for (const [pattern, level] of LOG_LEVEL_PATTERNS) {
      if (pattern.test(message)) return level
    }

    return 'info'
  }
}

export const logCollector = new LogCollector()
