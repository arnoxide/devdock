import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { ProjectStatus, ProjectRuntime } from '../../shared/types'

const PORT_PATTERNS = [
  /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/,
  /port\s+(\d+)/i,
  /listening\s+(?:on\s+)?(?:port\s+)?(\d+)/i
]

interface ManagedProcess {
  projectId: string
  process: ChildProcess
  status: ProjectStatus
  startedAt: Date
  port: number | null
  command: string
  cwd: string
}

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>()

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
      command,
      cwd
    }
    this.processes.set(projectId, managed)

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      this.emit('output', { projectId, data: text, source: 'stdout' })
      this.detectPort(managed, text)

      if (managed.status === 'starting') {
        managed.status = 'running'
        this.updateStatus(projectId, 'running', managed.port)
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
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
    if (managed.port !== null) return
    for (const pattern of PORT_PATTERNS) {
      const match = text.match(pattern)
      if (match) {
        managed.port = parseInt(match[1], 10)
        this.updateStatus(managed.projectId, managed.status, managed.port)
        // Emit port detected event for API endpoint detection
        this.emit('port-detected', {
          projectId: managed.projectId,
          port: managed.port
        })
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
