const { Router } = require('express')
const { requireAuth } = require('../auth')
const store = require('../store')
const processManager = require('../process-manager')
const { getDetectedRuntimes } = require('../runtime-detector')

const router = Router()
router.use(requireAuth)

function getRuntime(project) {
  const status = processManager.getStatus(project.id) || { status: 'idle', port: null }
  return {
    project,
    runtime: {
      projectId: project.id,
      status: status.status,
      pid: null,
      port: status.port ?? null,
      startedAt: null,
      cpu: 0,
      memory: 0,
      uptime: 0
    },
    output: processManager.getOutputBuffer(project.id).slice(-20)
  }
}

function maskDatabase(config) {
  const { connectionString, ...safe } = config
  return { ...safe, hasConnectionString: !!connectionString, status: { configId: config.id, status: 'disconnected' } }
}

function maskVault(vault) {
  return {
    ...vault,
    variables: (vault.variables || []).map((variable) => ({
      ...variable,
      value: variable.isSecret ? '••••••••' : variable.value
    }))
  }
}

function maskPassword(entry) {
  return { ...entry, password: entry.password ? '••••••••' : '' }
}

router.get('/processes', async (_req, res) => {
  const projects = store.get('projects', [])
  const detected = await getDetectedRuntimes(projects)
  res.json({
    processes: projects
      .filter((project) => !project.isGroup)
      .map((project) => ({
        project,
        runtime: detected[project.id] || getRuntime(project).runtime,
        output: processManager.getOutputBuffer(project.id).slice(-20)
      }))
  })
})

router.get('/databases', (_req, res) => {
  res.json({ connections: store.get('databaseConnections', []).map(maskDatabase) })
})

router.post('/databases/:id/test', (req, res) => {
  const connection = store.get('databaseConnections', []).find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }
  res.json({ configId: connection.id, status: 'disconnected', error: 'Standalone server cannot test database connections yet.' })
})

router.get('/databases/:id/tables', (req, res) => {
  const connection = store.get('databaseConnections', []).find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }
  res.status(501).json({ error: 'Standalone server cannot browse database tables yet. Use the Electron DevDock remote server.' })
})

router.get('/databases/:id/tables/:tableName', (req, res) => {
  const connection = store.get('databaseConnections', []).find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }
  res.status(501).json({ error: 'Standalone server cannot browse table data yet. Use the Electron DevDock remote server.' })
})

router.get('/production', (_req, res) => {
  const productionMetrics = store.get('productionMetrics', { credentials: [], pollingIntervalMs: 30000, enabled: false })
  res.json({
    settings: productionMetrics,
    credentials: (productionMetrics.credentials || []).map(({ token, secretAccessKey, accessKeyId, ...safe }) => ({
      ...safe,
      hasToken: !!token,
      hasAccessKeyId: !!accessKeyId,
      hasSecretAccessKey: !!secretAccessKey
    })),
    providerStatuses: {},
    services: [],
    deploymentsByService: {}
  })
})

router.post('/production/refresh', (_req, res) => {
  res.json({ ok: true, providerStatuses: {}, services: [], deploymentsByService: {} })
})

router.get('/vault', (_req, res) => {
  const config = store.get('securityVault', {})
  res.json({
    vaults: (config.vaults || []).map(maskVault),
    defaultPasswordLength: config.defaultPasswordLength,
    defaultPasswordOptions: config.defaultPasswordOptions,
    passwords: store.get('passwords', []).map(maskPassword)
  })
})

router.get('/settings', (_req, res) => {
  const creds = store.get('remoteCredentials')
  res.json({
    settings: store.get('globalSettings', {}),
    remote: {
      configured: !!(creds?.username && creds?.passwordHash),
      username: creds?.username || ''
    }
  })
})

router.patch('/settings', (req, res) => {
  const current = store.get('globalSettings', {})
  const allowed = ['theme', 'defaultShell', 'apiMonitorEnabled', 'systemMonitorIntervalMs', 'logRetentionCount', 'startMinimized', 'closeToTray', 'launchAtStartup', 'profile']
  const updates = {}
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key]
  }
  const merged = { ...current, ...updates }
  store.set('globalSettings', merged)
  res.json(merged)
})

module.exports = router
