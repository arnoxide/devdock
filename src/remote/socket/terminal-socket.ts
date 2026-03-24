import { Server as SocketServer, Socket } from 'socket.io'
import * as pty from 'node-pty'
import { verifyAccessToken } from '../auth'
import store from '../../main/store'
import { processManager } from '../../main/services/process-manager'

interface RemoteTerminal {
  pty: pty.IPty
  projectId: string
}

const terminals = new Map<string, RemoteTerminal>()

export function registerSocketHandlers(io: SocketServer): void {

  // Auth middleware for all socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('No token'))
    const payload = verifyAccessToken(token)
    if (!payload) return next(new Error('Invalid token'))
    ;(socket as any).user = payload
    next()
  })

  io.on('connection', (socket: Socket) => {

    // ── Terminal ─────────────────────────────────────────────────────────────

    socket.on('terminal:create', ({ projectId, cols = 80, rows = 24 }) => {
      const projects = store.get('projects', []) as any[]
      const project = projects.find((p: any) => p.id === projectId)
      if (!project) {
        socket.emit('terminal:error', 'Project not found')
        return
      }

      // Kill any existing terminal for this socket+project
      const key = `${socket.id}:${projectId}`
      const existing = terminals.get(key)
      if (existing) existing.pty.kill()

      const shell = process.env.SHELL || (process.platform === 'win32' ? 'cmd.exe' : 'bash')
      const term = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: project.path,
        env: { ...process.env } as Record<string, string>
      })

      terminals.set(key, { pty: term, projectId })

      term.onData((data) => socket.emit('terminal:data', data))
      term.onExit(() => {
        socket.emit('terminal:exit')
        terminals.delete(key)
      })

      socket.emit('terminal:ready', { key })
    })

    socket.on('terminal:write', ({ projectId, data }) => {
      const key = `${socket.id}:${projectId}`
      terminals.get(key)?.pty.write(data)
    })

    socket.on('terminal:resize', ({ projectId, cols, rows }) => {
      const key = `${socket.id}:${projectId}`
      terminals.get(key)?.pty.resize(cols, rows)
    })

    // ── Process output (read-only stream of running server) ──────────────────

    socket.on('output:subscribe', ({ projectId }) => {
      // Send existing buffered output
      const buf = processManager.getOutputBuffer(projectId)
      if (buf?.length) socket.emit('output:history', buf)

      // Subscribe to new output
      const onOutput = (data: { projectId: string; line: string }) => {
        if (data.projectId === projectId) socket.emit('output:line', data.line)
      }
      const onStatus = (data: { projectId: string; status: string; port?: number }) => {
        if (data.projectId === projectId) socket.emit('output:status', data)
      }

      processManager.on('output', onOutput)
      processManager.on('status-changed', onStatus)

      socket.on('output:unsubscribe', () => {
        processManager.off('output', onOutput)
        processManager.off('status-changed', onStatus)
      })
    })

    // ── Cleanup on disconnect ─────────────────────────────────────────────────

    socket.on('disconnect', () => {
      for (const [key, session] of terminals.entries()) {
        if (key.startsWith(socket.id)) {
          session.pty.kill()
          terminals.delete(key)
        }
      }
    })
  })
}
