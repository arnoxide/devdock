import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Request, Response, NextFunction } from 'express'
import store from '../main/store'

const ACCESS_SECRET = 'devdock-access-secret-change-in-prod'
const REFRESH_SECRET = 'devdock-refresh-secret-change-in-prod'
const ACCESS_TTL = '15m'
const REFRESH_TTL = '7d'

export interface TokenPayload {
  username: string
}

// ── Credential helpers ──────────────────────────────────────────────────────

export function hasCredentials(): boolean {
  const creds = store.get('remoteCredentials') as any
  return !!(creds?.username && creds?.passwordHash)
}

export async function setupCredentials(username: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12)
  store.set('remoteCredentials', { username, passwordHash })
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const creds = store.get('remoteCredentials') as any
  if (!creds) return false
  if (creds.username !== username) return false
  return bcrypt.compare(password, creds.passwordHash)
}

// ── Token helpers ────────────────────────────────────────────────────────────

export function issueTokens(username: string): { accessToken: string; refreshToken: string } {
  const payload: TokenPayload = { username }
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL })
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL })
  return { accessToken, refreshToken }
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}

// ── Express middleware ───────────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  const token = header.slice(7)
  const payload = verifyAccessToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }
  ;(req as any).user = payload
  next()
}
