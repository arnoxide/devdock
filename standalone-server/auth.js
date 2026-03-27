const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const store = require('./store')

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'devdock-access-secret-change-in-prod'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'devdock-refresh-secret-change-in-prod'
const ACCESS_TTL = '15m'
const REFRESH_TTL = '7d'

function hasCredentials() {
  const creds = store.get('remoteCredentials')
  return !!(creds?.username && creds?.passwordHash)
}

async function setupCredentials(username, password) {
  const passwordHash = await bcrypt.hash(password, 12)
  store.set('remoteCredentials', { username, passwordHash })
}

async function verifyCredentials(username, password) {
  const creds = store.get('remoteCredentials')
  if (!creds) return false
  if (creds.username !== username) return false
  return bcrypt.compare(password, creds.passwordHash)
}

function issueTokens(username) {
  const payload = { username }
  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL })
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL })
  return { accessToken, refreshToken }
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET)
  } catch {
    return null
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET)
  } catch {
    return null
  }
}

function requireAuth(req, res, next) {
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
  req.user = payload
  next()
}

module.exports = {
  hasCredentials,
  setupCredentials,
  verifyCredentials,
  issueTokens,
  verifyAccessToken,
  verifyRefreshToken,
  requireAuth
}
