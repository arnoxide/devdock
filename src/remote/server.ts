import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import authRoutes from './routes/auth-routes'
import projectRoutes from './routes/project-routes'
import filesRoutes from './routes/files-routes'
import gitRoutes from './routes/git-routes'
import { registerSocketHandlers } from './socket/terminal-socket'

const PORT = 7777
let httpServer: ReturnType<typeof createServer> | null = null

export async function startRemoteServer(): Promise<void> {
  if (httpServer) return // already running

  const app = express()

  app.use(cors({ origin: '*' }))
  app.use(express.json({ limit: '10mb' }))

  // ── Serve web app static files ────────────────────────────────────────────
  const webDistPath = path.join(__dirname, '../../remote-web/dist')
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath))
  }

  // ── API routes ────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/files', filesRoutes)
  app.use('/api/git', gitRoutes)

  // Health check
  app.get('/api/ping', (_req, res) => res.json({ ok: true, app: 'DevDock Remote' }))

  // Catch-all → serve web app (SPA routing)
  app.get('*path', (_req, res) => {
    const index = path.join(webDistPath, 'index.html')
    if (fs.existsSync(index)) {
      res.sendFile(index)
    } else {
      res.json({ ok: true, message: 'DevDock Remote API is running. Web app not built yet.' })
    }
  })

  // ── Socket.io ─────────────────────────────────────────────────────────────
  httpServer = createServer(app)
  const io = new SocketServer(httpServer, {
    cors: { origin: '*' }
  })
  registerSocketHandlers(io)

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(PORT, '0.0.0.0', () => resolve())
    httpServer!.on('error', reject)
  })

  console.log(`[DevDock Remote] Server running on http://localhost:${PORT}`)
}

export function stopRemoteServer(): void {
  if (httpServer) {
    httpServer.close()
    httpServer = null
  }
}

export function getRemotePort(): number {
  return PORT
}
