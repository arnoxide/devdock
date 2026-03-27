const { Router } = require('express')
const { hasCredentials, setupCredentials, verifyCredentials, issueTokens, verifyRefreshToken, requireAuth } = require('../auth')

const router = Router()

router.get('/status', (_req, res) => {
  res.json({ configured: hasCredentials() })
})

router.post('/setup', async (req, res) => {
  if (hasCredentials()) {
    res.status(400).json({ error: 'Already configured' })
    return
  }
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  try {
    await setupCredentials(username, password)
    const tokens = issueTokens(username)
    res.json(tokens)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  try {
    const valid = await verifyCredentials(username, password)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    res.json(issueTokens(username))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/refresh', (req, res) => {
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

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username })
})

module.exports = router
