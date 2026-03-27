const express = require('express')
const { createServer } = require('http')
const { Server: SocketServer } = require('socket.io')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const authRoutes = require('./routes/auth-routes')
const projectRoutes = require('./routes/project-routes')
const filesRoutes = require('./routes/files-routes')
const gitRoutes = require('./routes/git-routes')
const { registerSocketHandlers } = require('./socket/terminal-socket')

const PORT = process.env.PORT || 7777

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

// Serve web app
const webDist = path.join(__dirname, 'public')
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist))
}

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/files', filesRoutes)
app.use('/api/git', gitRoutes)

app.get('/api/ping', (_req, res) => res.json({ ok: true, app: 'DevDock Remote' }))

// SPA fallback
app.get('*path', (_req, res) => {
  const index = path.join(webDist, 'index.html')
  if (fs.existsSync(index)) {
    res.sendFile(index)
  } else {
    res.json({ ok: true, message: 'DevDock Remote API running. Web app not deployed yet.' })
  }
})

const httpServer = createServer(app)
const io = new SocketServer(httpServer, { cors: { origin: '*' } })
registerSocketHandlers(io)

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[DevDock] Server running on http://0.0.0.0:${PORT}`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
