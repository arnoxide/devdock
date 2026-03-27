const { spawn } = require('child_process')
const { EventEmitter } = require('events')

const PORT_PATTERNS = [
  { regex: /(?:running|started|listening|serving)\s+(?:on\s+)?(?:at\s+)?(?:port\s+)?(?:https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):)?(\d+)/i, confidence: 'high' },
  { regex: /listening\s+(?:on\s+)?(?:port\s+)?(\d+)/i, confidence: 'high' },
  { regex: /port\s+(\d+)/i, confidence: 'low' },
  { regex: /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/i, confidence: 'low' }
]

class ProcessManager extends EventEmitter {
  constructor() {
    super()
    this.processes = new Map()
    this.outputBuffers = new Map()
  }

  getOutputBuffer(projectId) {
    return this.outputBuffers.get(projectId) ?? []
  }

  getStatus(projectId) {
    const m = this.processes.get(projectId)
    if (!m) return null
    return { status: m.status, port: m.port }
  }

  async start(projectId, command, cwd) {
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

    const managed = {
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

    const bufferLine = (line) => {
      const buf = this.outputBuffers.get(projectId) ?? []
      buf.push(line)
      if (buf.length > 500) buf.shift()
      this.outputBuffers.set(projectId, buf)
    }

    child.stdout?.on('data', (data) => {
      const text = data.toString()
      bufferLine(text)
      this.emit('output', { projectId, line: text })
      this.detectPort(managed, text)
      if (managed.status === 'starting') {
        managed.status = 'running'
        this.updateStatus(projectId, 'running', managed.port)
      }
    })

    child.stderr?.on('data', (data) => {
      const text = data.toString()
      bufferLine(text)
      this.emit('output', { projectId, line: text })
      this.detectPort(managed, text)
      if (managed.status === 'starting') {
        managed.status = 'running'
        this.updateStatus(projectId, 'running', managed.port)
      }
    })

    child.on('error', (err) => {
      managed.status = 'error'
      this.updateStatus(projectId, 'error')
      this.processes.delete(projectId)
    })

    child.on('exit', (code, signal) => {
      managed.status = 'idle'
      this.updateStatus(projectId, 'idle')
      this.processes.delete(projectId)
    })
  }

  async stop(projectId) {
    const managed = this.processes.get(projectId)
    if (!managed) return
    managed.status = 'stopping'
    this.updateStatus(projectId, 'stopping')
    try {
      process.kill(-managed.process.pid, 'SIGTERM')
    } catch {
      managed.process.kill('SIGTERM')
    }
    setTimeout(() => {
      if (this.processes.has(projectId)) {
        try { process.kill(-managed.process.pid, 'SIGKILL') } catch {
          managed.process.kill('SIGKILL')
        }
      }
    }, 5000)
  }

  async restart(projectId) {
    const managed = this.processes.get(projectId)
    if (managed) {
      const { command, cwd } = managed
      await this.stop(projectId)
      await new Promise((resolve) => {
        const check = () => {
          if (!this.processes.has(projectId)) resolve()
          else setTimeout(check, 100)
        }
        check()
      })
      await this.start(projectId, command, cwd)
    }
  }

  isRunning(projectId) {
    return this.processes.has(projectId)
  }

  detectPort(managed, text) {
    if (/is in use|already in use|EADDRINUSE/i.test(text)) return
    const stripped = text.replace(/\x1b\[[0-9;]*m/g, '')
    if (/^\s*['"\[]/.test(stripped) || /allowed\s*origins/i.test(stripped)) return

    for (const { regex, confidence } of PORT_PATTERNS) {
      const match = stripped.match(regex)
      if (match) {
        const port = parseInt(match[1], 10)
        if (isNaN(port) || port < 1 || port > 65535) continue
        const shouldUpdate =
          managed.port === null ||
          (confidence === 'high' && managed.portConfidence !== 'high') ||
          (confidence === 'high' && managed.port !== port)
        if (shouldUpdate && managed.port !== port) {
          managed.port = port
          managed.portConfidence = confidence
          this.updateStatus(managed.projectId, managed.status, managed.port)
        }
        break
      }
    }
  }

  updateStatus(projectId, status, port) {
    const m = this.processes.get(projectId)
    this.emit('status-changed', {
      projectId,
      status,
      port: port ?? m?.port ?? null
    })
  }
}

module.exports = new ProcessManager()
