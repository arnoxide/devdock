const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('./db')

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY || 'devdock-hub-dev-secret'
const JWT_TTL = process.env.JWT_TTL || '7d'

function issueUserToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, type: 'user' }, JWT_SECRET, { expiresIn: JWT_TTL })
}

function createAgentToken() {
  return `ddag_${crypto.randomBytes(32).toString('hex')}`
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

async function requireUser(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Missing token' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.type !== 'user') return res.status(401).json({ error: 'Invalid token type' })
    const { rows } = await query('SELECT id, email, display_name FROM users WHERE id = $1', [payload.sub])
    if (!rows[0]) return res.status(401).json({ error: 'User not found' })
    req.user = rows[0]
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

async function requireAgent(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Missing agent token' })

  const { rows } = await query(
    `SELECT a.*, u.email
     FROM agents a
     JOIN users u ON u.id = a.user_id
     WHERE a.token_hash = $1`,
    [hashToken(token)]
  )

  if (!rows[0]) return res.status(401).json({ error: 'Invalid agent token' })
  req.agent = rows[0]
  req.user = { id: rows[0].user_id, email: rows[0].email }
  await query('UPDATE agents SET last_seen_at = now(), updated_at = now() WHERE id = $1', [rows[0].id])
  next()
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

module.exports = {
  issueUserToken,
  createAgentToken,
  hashToken,
  requireUser,
  requireAgent,
  hashPassword,
  verifyPassword,
}
