import { EventEmitter } from 'node:events'
import { processManager } from './process-manager'
import { v4 as uuid } from 'uuid'

export interface LogMetricPattern {
    id: string
    name: string
    regex: RegExp
    type: 'event' | 'error' | 'traffic'
    color: string
}

export interface LogMetricEvent {
    id: string
    projectId: string
    patternId: string
    timestamp: string
    data?: string
}

export interface LogMetricStats {
    projectId: string
    patternId: string
    count: number
    lastOccurred: string
}

class LogMetricAnalyzer extends EventEmitter {
    private patterns: LogMetricPattern[] = [
        {
            id: 'login_attempt',
            name: 'Login Attempt',
            regex: /Login attempt:/i,
            type: 'event',
            color: '#3b82f6' // Blue
        },
        {
            id: 'http_request',
            name: 'HTTP Request',
            regex: /(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]*)/,
            type: 'traffic',
            color: '#10b981' // Green
        },
        {
            id: 'db_connected',
            name: 'DB Connected',
            regex: /MongoDB connected successfully|Database connected/i,
            type: 'event',
            color: '#8b5cf6' // Purple
        },
        {
            id: 'error_log',
            name: 'Error',
            regex: /error|exception/i,
            type: 'error',
            color: '#ef4444' // Red
        }
    ]

    // projectId -> patternId -> stats
    private stats = new Map<string, Map<string, LogMetricStats>>()

    constructor() {
        super()
        this.setupListeners()
    }

    private setupListeners() {
        processManager.on('output', ({ projectId, data }) => {
            this.analyzeLog(projectId, data)
        })
    }

    private analyzeLog(projectId: string, content: string) {
        let hasMatch = false

        for (const pattern of this.patterns) {
            if (pattern.regex.test(content)) {
                this.recordMatch(projectId, pattern, content)
                hasMatch = true
            }
        }

        if (hasMatch) {
            this.emitStatsUpdate(projectId)
        }
    }

    private recordMatch(projectId: string, pattern: LogMetricPattern, content: string) {
        if (!this.stats.has(projectId)) {
            this.stats.set(projectId, new Map())
        }

        const projectStats = this.stats.get(projectId)!

        if (!projectStats.has(pattern.id)) {
            projectStats.set(pattern.id, {
                projectId,
                patternId: pattern.id,
                count: 0,
                lastOccurred: new Date().toISOString()
            })
        }

        const stat = projectStats.get(pattern.id)!
        stat.count++
        stat.lastOccurred = new Date().toISOString()

        // Emit real-time event
        this.emit('metric-event', {
            id: uuid(),
            projectId,
            patternId: pattern.id,
            timestamp: new Date().toISOString(),
            data: content.trim().substring(0, 100) // First 100 chars
        })
    }

    private emitStatsUpdate(projectId: string) {
        const projectStats = this.stats.get(projectId)
        if (projectStats) {
            this.emit('stats-updated', Array.from(projectStats.values()))
        }
    }

    getPatterns(): LogMetricPattern[] {
        return this.patterns
    }

    getStats(projectId: string): LogMetricStats[] {
        const projectStats = this.stats.get(projectId)
        return projectStats ? Array.from(projectStats.values()) : []
    }
}

export const logMetricAnalyzer = new LogMetricAnalyzer()
