const express = require('express')
const cors = require('cors')
const {
  issueUserToken,
  createAgentToken,
  hashToken,
  requireUser,
  requireAgent,
  hashPassword,
  verifyPassword,
} = require('./auth')
const { initDb, query } = require('./db')

const PORT = process.env.PORT || 8080

function cleanUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name || '' }
}

function safeJson(value, fallback) {
  return value === undefined ? fallback : value
}

async function upsertJsonSnapshot(table, conflictColumns, columns, values, updateSql) {
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
  await query(
    `INSERT INTO ${table} (${columns.join(', ')})
     VALUES (${placeholders})
     ON CONFLICT (${conflictColumns.join(', ')})
     DO UPDATE SET ${updateSql}, updated_at = now()`,
    values
  )
}

async function main() {
  await initDb()

  const app = express()
  app.use(cors({ origin: '*' }))
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, app: 'DevDock Hub' })
  })

  app.post('/api/auth/register', async (req, res) => {
    const { email, password, displayName = '' } = req.body || {}
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password with at least 8 characters are required' })
    }

    try {
      const { rows } = await query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name`,
        [email.trim().toLowerCase(), await hashPassword(password), displayName.trim()]
      )
      res.json({ user: cleanUser(rows[0]), token: issueUserToken(rows[0]) })
    } catch (err) {
      if (String(err.message).includes('duplicate')) return res.status(409).json({ error: 'Email already registered' })
      res.status(500).json({ error: err.message })
    }
  })

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {}
    const { rows } = await query('SELECT id, email, display_name, password_hash FROM users WHERE email = $1', [
      String(email || '').trim().toLowerCase(),
    ])
    const user = rows[0]
    if (!user || !(await verifyPassword(password || '', user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.json({ user: cleanUser(user), token: issueUserToken(user) })
  })

  app.get('/api/me', requireUser, (req, res) => {
    res.json({ user: cleanUser(req.user) })
  })

  app.get('/api/agents', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT id, name, last_seen_at, metadata, created_at, updated_at
       FROM agents
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )
    res.json({ agents: rows })
  })

  app.post('/api/agents', requireUser, async (req, res) => {
    const token = createAgentToken()
    const { rows } = await query(
      `INSERT INTO agents (user_id, name, token_hash, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, created_at`,
      [req.user.id, req.body?.name || 'Desktop Agent', hashToken(token), safeJson(req.body?.metadata, {})]
    )
    res.json({ agent: rows[0], token })
  })

  app.post('/api/agent/heartbeat', requireAgent, async (req, res) => {
    await query(
      `UPDATE agents
       SET last_seen_at = now(), metadata = COALESCE($2, metadata), updated_at = now()
       WHERE id = $1`,
      [req.agent.id, safeJson(req.body?.metadata, null)]
    )
    res.json({ ok: true })
  })

  app.put('/api/agent/projects', requireAgent, async (req, res) => {
    const projects = Array.isArray(req.body?.projects) ? req.body.projects : []
    for (const project of projects) {
      await upsertJsonSnapshot(
        'projects',
        ['user_id', 'id'],
        ['id', 'user_id', 'agent_id', 'name', 'path', 'type', 'is_group', 'parent_id', 'color', 'start_command', 'status', 'port', 'external', 'metadata', 'last_seen_at'],
        [
          project.id,
          req.user.id,
          req.agent.id,
          project.name || project.id,
          project.path || null,
          project.type || null,
          !!project.isGroup,
          project.parentId || null,
          project.color || null,
          project.startCommand || null,
          project.status || 'idle',
          project.port || null,
          !!project.external,
          project.metadata || {},
          new Date(),
        ],
        `agent_id = EXCLUDED.agent_id,
         name = EXCLUDED.name,
         path = EXCLUDED.path,
         type = EXCLUDED.type,
         is_group = EXCLUDED.is_group,
         parent_id = EXCLUDED.parent_id,
         color = EXCLUDED.color,
         start_command = EXCLUDED.start_command,
         status = EXCLUDED.status,
         port = EXCLUDED.port,
         external = EXCLUDED.external,
         metadata = EXCLUDED.metadata,
         last_seen_at = EXCLUDED.last_seen_at`
      )
    }
    res.json({ ok: true, count: projects.length })
  })

  app.put('/api/agent/processes', requireAgent, async (req, res) => {
    const processes = Array.isArray(req.body?.processes) ? req.body.processes : []
    for (const item of processes) {
      const runtime = item.runtime || item
      await upsertJsonSnapshot(
        'process_snapshots',
        ['user_id', 'project_id'],
        ['user_id', 'project_id', 'agent_id', 'status', 'pid', 'port', 'external', 'process_name', 'output'],
        [
          req.user.id,
          runtime.projectId || item.projectId,
          req.agent.id,
          runtime.status || 'idle',
          runtime.pid || null,
          runtime.port || null,
          !!runtime.external,
          runtime.processName || null,
          item.output || [],
        ],
        `agent_id = EXCLUDED.agent_id,
         status = EXCLUDED.status,
         pid = EXCLUDED.pid,
         port = EXCLUDED.port,
         external = EXCLUDED.external,
         process_name = EXCLUDED.process_name,
         output = EXCLUDED.output`
      )
    }
    res.json({ ok: true, count: processes.length })
  })

  app.put('/api/agent/git', requireAgent, async (req, res) => {
    const repos = Array.isArray(req.body?.repos) ? req.body.repos : []
    for (const repo of repos) {
      await upsertJsonSnapshot(
        'git_snapshots',
        ['user_id', 'project_id'],
        ['user_id', 'project_id', 'agent_id', 'branch', 'changes', 'commits', 'error'],
        [req.user.id, repo.projectId, req.agent.id, repo.branch || null, repo.changes || [], repo.commits || [], repo.error || null],
        `agent_id = EXCLUDED.agent_id,
         branch = EXCLUDED.branch,
         changes = EXCLUDED.changes,
         commits = EXCLUDED.commits,
         error = EXCLUDED.error`
      )
    }
    res.json({ ok: true, count: repos.length })
  })

  app.put('/api/agent/production', requireAgent, async (req, res) => {
    const services = Array.isArray(req.body?.services) ? req.body.services : []
    for (const item of services) {
      const service = item.service || item
      await upsertJsonSnapshot(
        'production_snapshots',
        ['user_id', 'provider', 'service_id'],
        ['user_id', 'provider', 'service_id', 'agent_id', 'service', 'deployments', 'performance', 'resources', 'status'],
        [
          req.user.id,
          service.provider,
          service.id,
          req.agent.id,
          service,
          item.deployments || [],
          item.performance || [],
          item.resources || [],
          item.status || item.deployments?.[0]?.status || null,
        ],
        `agent_id = EXCLUDED.agent_id,
         service = EXCLUDED.service,
         deployments = EXCLUDED.deployments,
         performance = EXCLUDED.performance,
         resources = EXCLUDED.resources,
         status = EXCLUDED.status`
      )
    }
    res.json({ ok: true, count: services.length })
  })

  app.put('/api/agent/databases', requireAgent, async (req, res) => {
    const databases = Array.isArray(req.body?.databases) ? req.body.databases : []
    for (const db of databases) {
      await upsertJsonSnapshot(
        'database_snapshots',
        ['user_id', 'connection_id'],
        ['user_id', 'connection_id', 'agent_id', 'name', 'type', 'status', 'tables', 'metadata'],
        [req.user.id, db.id || db.connectionId, req.agent.id, db.name, db.type, db.status || 'unknown', db.tables || [], db.metadata || {}],
        `agent_id = EXCLUDED.agent_id,
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         tables = EXCLUDED.tables,
         metadata = EXCLUDED.metadata`
      )
    }
    res.json({ ok: true, count: databases.length })
  })

  app.get('/api/projects', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT p.*, ps.status AS runtime_status, ps.port AS runtime_port, ps.external AS runtime_external
       FROM projects p
       LEFT JOIN process_snapshots ps ON ps.user_id = p.user_id AND ps.project_id = p.id
       WHERE p.user_id = $1
       ORDER BY p.is_group DESC, p.name ASC`,
      [req.user.id]
    )
    res.json({ projects: rows })
  })

  app.get('/api/processes', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT ps.*, p.name, p.path, p.type
       FROM process_snapshots ps
       LEFT JOIN projects p ON p.user_id = ps.user_id AND p.id = ps.project_id
       WHERE ps.user_id = $1
       ORDER BY ps.updated_at DESC`,
      [req.user.id]
    )
    res.json({ processes: rows })
  })

  app.get('/api/git', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT gs.*, p.name, p.path
       FROM git_snapshots gs
       LEFT JOIN projects p ON p.user_id = gs.user_id AND p.id = gs.project_id
       WHERE gs.user_id = $1
       ORDER BY gs.updated_at DESC`,
      [req.user.id]
    )
    res.json({ repos: rows })
  })

  app.get('/api/production', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT provider, service_id, service, deployments, performance, resources, status, updated_at
       FROM production_snapshots
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )
    res.json({ services: rows })
  })

  app.get('/api/databases', requireUser, async (req, res) => {
    const { rows } = await query(
      `SELECT connection_id, name, type, status, tables, metadata, updated_at
       FROM database_snapshots
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    )
    res.json({ databases: rows })
  })

  app.post('/api/commands', requireUser, async (req, res) => {
    const { agentId, targetType, targetId = null, action, payload = {} } = req.body || {}
    if (!targetType || !action) return res.status(400).json({ error: 'targetType and action are required' })
    const { rows } = await query(
      `INSERT INTO commands (user_id, agent_id, target_type, target_id, action, payload)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, agentId || null, targetType, targetId, action, payload]
    )
    res.json({ command: rows[0] })
  })

  app.get('/api/agent/commands', requireAgent, async (req, res) => {
    const { rows } = await query(
      `UPDATE commands
       SET status = 'claimed', claimed_at = now()
       WHERE id IN (
         SELECT id FROM commands
         WHERE user_id = $1
           AND status = 'queued'
           AND (agent_id IS NULL OR agent_id = $2)
         ORDER BY created_at ASC
         LIMIT 20
       )
       RETURNING *`,
      [req.user.id, req.agent.id]
    )
    res.json({ commands: rows })
  })

  app.patch('/api/agent/commands/:id', requireAgent, async (req, res) => {
    const status = req.body?.status || 'completed'
    const result = req.body?.result || {}
    const { rows } = await query(
      `UPDATE commands
       SET status = $1, result = $2, completed_at = now()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, result, req.params.id, req.user.id]
    )
    res.json({ command: rows[0] || null })
  })

  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` })
  })

  app.listen(PORT, () => {
    console.log(`[DevDock Hub] listening on :${PORT}`)
  })
}

main().catch((err) => {
  console.error('[DevDock Hub] failed to start:', err)
  process.exit(1)
})
