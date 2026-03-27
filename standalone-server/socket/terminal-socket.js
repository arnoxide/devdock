const pty = require('node-pty')
const { verifyAccessToken } = require('../auth')
const store = require('../store')
const processManager = require('../process-manager')

const terminals = new Map()

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('No token'))
    const payload = verifyAccessToken(token)
    if (!payload) return next(new Error('Invalid token'))
    socket.user = payload
    next()
  })

  io.on('connection', (socket) => {
    socket.on('terminal:create', ({ projectId, cols = 80, rows = 24 }) => {
      const projects = store.get('projects', [])
      const project = projects.find((p) => p.id === projectId)
      if (!project) {
        socket.emit('terminal:error', 'Project not found')
        return
      }

      const key = `${socket.id}:${projectId}`
      const existing = terminals.get(key)
      if (existing) existing.pty.kill()

      const shell = process.env.SHELL || 'bash'
      const term = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: project.path,
        env: { ...process.env }
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

    socket.on('output:subscribe', ({ projectId }) => {
      const buf = processManager.getOutputBuffer(projectId)
      if (buf?.length) socket.emit('output:history', buf)

      const onOutput = (data) => {
        if (data.projectId === projectId) socket.emit('output:line', data.line)
      }
      const onStatus = (data) => {
        if (data.projectId === projectId) socket.emit('output:status', data)
      }

      processManager.on('output', onOutput)
      processManager.on('status-changed', onStatus)

      socket.on('output:unsubscribe', () => {
        processManager.off('output', onOutput)
        processManager.off('status-changed', onStatus)
      })
    })

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

module.exports = { registerSocketHandlers }
