import { Router, Request, Response } from 'express'
import {
  hasCredentials,
  setupCredentials,
  verifyCredentials,
  issueTokens,
  verifyRefreshToken,
  requireAuth
} from '../auth'

const router = Router()

// First-time setup — only allowed if no credentials exist yet
router.post('/setup', async (req: Request, res: Response) => {
  if (hasCredentials()) {
    res.status(403).json({ error: 'Already configured' })
    return
  }
  const { username, password } = req.body
  if (!username || !password || password.length < 8) {
    res.status(400).json({ error: 'Username and password (min 8 chars) required' })
    return
  }
  await setupCredentials(username, password)
  const tokens = issueTokens(username)
  res.json(tokens)
})

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  const ok = await verifyCredentials(username, password)
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }
  res.json(issueTokens(username))
})

// Refresh access token using refresh token
router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' })
    return
  }
  const payload = verifyRefreshToken(refreshToken)
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
    return
  }
  res.json(issueTokens(payload.username))
})

// Check setup status (public — used by web app to decide which screen to show)
router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: hasCredentials() })
})

// Get current user info
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ username: (req as any).user.username })
})

export default router
