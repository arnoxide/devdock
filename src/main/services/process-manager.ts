import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { ProjectStatus, ProjectRuntime } from '../../shared/types'

// Patterns ordered by confidence: server announcements first, URLs last
// High-confidence: explicit server startup messages
// Low-confidence: URLs that may appear in config/cors output
const PORT_PATTERNS: { regex: RegExp; confidence: 'high' | 'low' }[] = [
  { regex: /(?:running|started|listening|serving)\s+(?:on\s+)?(?:at\s+)?(?:port\s+)?(?:https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):)?(\d+)/i, confidence: 'high' },
  { regex: /listening\s+(?:on\s+)?(?:port\s+)?(\d+)/i, confidence: 'high' },
  { regex: /port\s+(\d+)/i, confidence: 'low' },
  { regex: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i, confidence: 'low' }
]

interface ManagedProcess {
  projectId: string
  process: ChildProcess
  status: ProjectStatus
  startedAt: Date
  port: number | null
  portConfidence: 'high' | 'low' | null
  command: string
  cwd: string
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>()
  private outputBuffers = new Map<string, string[]>() // last 500 lines per project

  getOutputBuffer(projectId: string): string[] {
    return this.outputBuffers.get(projectId) ?? []
  }

  getStatus(projectId: string): { status: string; port: number | null } | null {
    const m = this.processes.get(projectId)
    if (!m) return null
    return { status: m.status, port: m.port }
  }

  async start(projectId: string, command: string, cwd: string): Promise<void> {
    if (this.processes.has(projectId)) {
      throw new Error(`Process already running for project ${projectId}`)
    }

    this.updateStatus(projectId, 'starting')

    const child = spawn(command, [], {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const managed: ManagedProcess = {
      projectId,
      process: child,
      status: 'starting',
      startedAt: new Date(),
      port: null,
      portConfidence: null,
      command,
      cwd
    }
    this.processes.set(projectId, managed)

    const bufferLine = (line: string): void => {
      const buf = this.outputBuffers.get(projectId) ?? []
      buf.push(line)
      if (buf.length > 500) buf.shift()
      this.outputBuffers.set(projectId, buf)
    }

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      bufferLine(text)
      this.emit('output', { projectId, data: text, source: 'stdout' })
      this.detectPort(managed, text)

      if (managed.status === 'starting') {
        managed.status = 'running'
        this.updateStatus(projectId, 'running', managed.port)
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      bufferLine(text)
      this.emit('output', { projectId, data: text, source: 'stderr' })
      // Some frameworks output to stderr even on success (e.g., webpack warnings)
      this.detectPort(managed, text)

      if (managed.status === 'starting') {
        managed.status = 'running'
        this.updateStatus(projectId, 'running', managed.port)
      }
    })

    child.on('error', (err) => {
      managed.status = 'error'
      this.emit('output', {
        projectId,
        data: `\r\nProcess error: ${err.message}\r\n`,
        source: 'stderr'
      })
      this.updateStatus(projectId, 'error')
      this.processes.delete(projectId)
    })

    child.on('exit', (code, signal) => {
      managed.status = 'idle'
      this.emit('output', {
        projectId,
        data: `\r\nProcess exited with code ${code}${signal ? ` (signal: ${signal})` : ''}\r\n`,
        source: 'system'
      })
      this.updateStatus(projectId, 'idle')
      this.processes.delete(projectId)
    })
  }

  async stop(projectId: string): Promise<void> {
    const managed = this.processes.get(projectId)
    if (!managed) return

    managed.status = 'stopping'
    this.updateStatus(projectId, 'stopping')

    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(managed.process.pid), '/T', '/F'])
    } else {
      // Kill entire process group
      try {
        process.kill(-managed.process.pid!, 'SIGTERM')
      } catch {
        managed.process.kill('SIGTERM')
      }

      // Force kill after timeout
      setTimeout(() => {
        if (this.processes.has(projectId)) {
          try {
            process.kill(-managed.process.pid!, 'SIGKILL')
          } catch {
            managed.process.kill('SIGKILL')
          }
        }
      }, 5000)
    }
  }

  async restart(projectId: string): Promise<void> {
    const managed = this.processes.get(projectId)
    if (managed) {
      const { command, cwd } = managed
      await this.stop(projectId)
      // Wait for process to fully exit
      await new Promise<void>((resolve) => {
        const check = (): void => {
          if (!this.processes.has(projectId)) resolve()
          else setTimeout(check, 100)
        }
        check()
      })
      await this.start(projectId, command, cwd)
    }
  }

  getRuntime(projectId: string): ProjectRuntime {
    const managed = this.processes.get(projectId)
    if (!managed) {
      return {
        projectId,
        status: 'idle',
        pid: null,
        port: null,
        startedAt: null,
        cpu: 0,
        memory: 0,
        uptime: 0
      }
    }

    const uptimeMs = Date.now() - managed.startedAt.getTime()
    return {
      projectId,
      status: managed.status,
      pid: managed.process.pid ?? null,
      port: managed.port,
      startedAt: managed.startedAt.toISOString(),
      cpu: 0,
      memory: 0,
      uptime: Math.floor(uptimeMs / 1000)
    }
  }

  getAllRuntimes(): ProjectRuntime[] {
    return Array.from(this.processes.keys()).map((id) => this.getRuntime(id))
  }

  isRunning(projectId: string): boolean {
    return this.processes.has(projectId)
  }

  async shutdown(): Promise<void> {
    const stops = Array.from(this.processes.keys()).map((id) => this.stop(id))
    await Promise.allSettled(stops)
  }

  private detectPort(managed: ManagedProcess, text: string): void {
    // Ignore "port in use" messages
    if (/is in use|already in use|EADDRINUSE/i.test(text)) return

    // Skip lines that look like config/array output (CORS origins, env vars, etc.)
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '')
    if (/^\s*['"\[]/.test(stripped) || /allowed\s*origins/i.test(stripped)) return

    for (const { regex, confidence } of PORT_PATTERNS) {
      const match = stripped.match(regex)
      if (match) {
        const port = parseInt(match[1], 10)
        if (isNaN(port) || port < 1 || port > 65535) continue

        // Update port if:
        // 1. No port detected yet
        // 2. New match is high-confidence and current is low-confidence
        // 3. Same confidence but different port from a high-confidence source
        const shouldUpdate =
          managed.port === null ||
          (confidence === 'high' && managed.portConfidence !== 'high') ||
          (confidence === 'high' && managed.port !== port)

        if (shouldUpdate && managed.port !== port) {
          managed.port = port
          managed.portConfidence = confidence
          this.updateStatus(managed.projectId, managed.status, managed.port)
          this.emit('port-detected', {
            projectId: managed.projectId,
            port: managed.port
          })
        }
        break
      }
    }
  }

  private updateStatus(
    projectId: string,
    status: ProjectStatus,
    port?: number | null
  ): void {
    this.emit('status-changed', {
      ...this.getRuntime(projectId),
      status,
      port: port ?? this.processes.get(projectId)?.port ?? null
    })
  }
}

export const processManager = new ProcessManager()
