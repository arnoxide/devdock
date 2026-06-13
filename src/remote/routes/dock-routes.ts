import { Router, Request, Response } from 'express'
import { requireAuth } from '../auth'
import store from '../../main/store'
import { processManager } from '../../main/services/process-manager'
import { dbMonitor } from '../../main/services/db-monitor'
import { productionMetrics } from '../../main/services/production-metrics'
import { getDetectedRuntimes } from '../runtime-detector'
import {
  DbConnectionConfig,
  GlobalSettings,
  PasswordEntry,
  ProjectConfig,
  ProjectEnvVault
} from '../../shared/types'

const router = Router()
router.use(requireAuth)

function maskDatabase(config: DbConnectionConfig): Omit<DbConnectionConfig, 'connectionString'> & { hasConnectionString: boolean } {
  const { connectionString: _connectionString, ...safe } = config
  return { ...safe, hasConnectionString: !!config.connectionString }
}

function maskVault(vault: ProjectEnvVault): ProjectEnvVault {
  return {
    ...vault,
    variables: vault.variables.map((variable) => ({
      ...variable,
      value: variable.isSecret ? '••••••••' : variable.value
    }))
  }
}

function maskPassword(entry: PasswordEntry): PasswordEntry {
  return { ...entry, password: entry.password ? '••••••••' : '' }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

router.get('/processes', async (_req: Request, res: Response) => {
  const projects = store.get('projects', []) as ProjectConfig[]
  const detected = await getDetectedRuntimes(projects)
  const runtimes = projects
    .filter((project) => !project.isGroup)
    .map((project) => ({
      project,
      runtime: detected[project.id] || processManager.getRuntime(project.id),
      output: processManager.getOutputBuffer(project.id).slice(-20)
    }))

  res.json({ processes: runtimes })
})

router.get('/databases', (_req: Request, res: Response) => {
  const connections = dbMonitor.getAllConfigs()
  res.json({
    connections: connections.map((connection) => ({
      ...maskDatabase(connection),
      status: dbMonitor.getStatus(connection.id)
    }))
  })
})

router.post('/databases/:id/test', async (req: Request, res: Response) => {
  const savedConnections = store.get('databaseConnections', []) as DbConnectionConfig[]
  const connection = savedConnections.find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }
  try {
    const result = await withTimeout(
      dbMonitor.testConnection(connection),
      10000,
      'Database connection test timed out after 10 seconds'
    )
    const afterTest = store.get('databaseConnections', []) as DbConnectionConfig[]
    if (!afterTest.some((config) => config.id === connection.id)) {
      store.set('databaseConnections', [...afterTest, connection])
    }
    res.json(result)
  } catch (err: any) {
    const afterTest = store.get('databaseConnections', []) as DbConnectionConfig[]
    if (!afterTest.some((config) => config.id === connection.id)) {
      store.set('databaseConnections', [...afterTest, connection])
    }
    res.json({
      configId: connection.id,
      status: 'error',
      error: err.message || 'Database connection test failed',
      serverVersion: null,
      latencyMs: null,
      lastCheckedAt: new Date().toISOString()
    })
  }
})

router.get('/databases/:id/tables', async (req: Request, res: Response) => {
  const savedConnections = store.get('databaseConnections', []) as DbConnectionConfig[]
  const connection = savedConnections.find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }

  try {
    await withTimeout(dbMonitor.testConnection(connection), 10000, 'Database connection timed out')
    const tables = await withTimeout(dbMonitor.listTables(connection.id), 10000, 'Listing tables timed out')
    res.json({ tables })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list database tables' })
  }
})

router.get('/databases/:id/tables/:tableName', async (req: Request, res: Response) => {
  const savedConnections = store.get('databaseConnections', []) as DbConnectionConfig[]
  const connection = savedConnections.find((config) => config.id === req.params.id)
  if (!connection) {
    res.status(404).json({ error: 'Database connection not found' })
    return
  }

  const page = Number(req.query.page || 1)
  const pageSize = Math.min(Number(req.query.pageSize || 25), 100)

  try {
    await withTimeout(dbMonitor.testConnection(connection), 10000, 'Database connection timed out')
    const tableData = await withTimeout(
      dbMonitor.getTableData(connection.id, req.params.tableName, page, pageSize),
      10000,
      'Loading table data timed out'
    )
    res.json(tableData)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load table data' })
  }
})

router.get('/production', (_req: Request, res: Response) => {
  const credentials = productionMetrics.getCredentials()
  const settings = productionMetrics.getSettings()
  const services = productionMetrics.getServices()
  const deploymentsByService = Object.fromEntries(
    services.map((service) => [service.id, productionMetrics.getDeployments(service.id)])
  )
  res.json({
    settings: {
      ...settings,
      credentials: settings.credentials.map(({ token: _token, secretAccessKey: _secretAccessKey, accessKeyId: _accessKeyId, ...safe }) => ({
        ...safe,
        hasToken: !!_token,
        hasAccessKeyId: !!_accessKeyId,
        hasSecretAccessKey: !!_secretAccessKey
      }))
    },
    credentials: credentials.map(({ token: _token, secretAccessKey: _secretAccessKey, accessKeyId: _accessKeyId, ...safe }) => ({
      ...safe,
      hasToken: !!_token,
      hasAccessKeyId: !!_accessKeyId,
      hasSecretAccessKey: !!_secretAccessKey
    })),
    providerStatuses: productionMetrics.getProviderStatuses(),
    services,
    deploymentsByService
  })
})

router.post('/production/refresh', async (_req: Request, res: Response) => {
  const credentials = productionMetrics.getCredentials().filter((creds) => creds.enabled)
  await Promise.allSettled(credentials.map((creds) => productionMetrics.fetchAllForProvider(creds)))
  res.json({
    ok: true,
    providerStatuses: productionMetrics.getProviderStatuses(),
    services: productionMetrics.getServices(),
    deploymentsByService: Object.fromEntries(
      productionMetrics.getServices().map((service) => [service.id, productionMetrics.getDeployments(service.id)])
    )
  })
})

router.get('/vault', (_req: Request, res: Response) => {
  const config = store.get('securityVault') as any
  const passwords = store.get('passwords', []) as PasswordEntry[]
  res.json({
    vaults: ((config?.vaults || []) as ProjectEnvVault[]).map(maskVault),
    defaultPasswordLength: config?.defaultPasswordLength,
    defaultPasswordOptions: config?.defaultPasswordOptions,
    passwords: passwords.map(maskPassword)
  })
})

router.get('/settings', (_req: Request, res: Response) => {
  const settings = store.get('globalSettings') as GlobalSettings
  const creds = store.get('remoteCredentials' as any) as any
  res.json({
    settings,
    remote: {
      configured: !!(creds?.username && creds?.passwordHash),
      username: creds?.username || ''
    }
  })
})

router.patch('/settings', (req: Request, res: Response) => {
  const current = store.get('globalSettings') as GlobalSettings
  const allowed = ['theme', 'defaultShell', 'apiMonitorEnabled', 'systemMonitorIntervalMs', 'logRetentionCount', 'startMinimized', 'closeToTray', 'launchAtStartup', 'profile']
  const updates: Partial<GlobalSettings> = {}

  for (const key of allowed) {
    if (key in req.body) {
      ;(updates as any)[key] = req.body[key]
    }
  }

  const merged = { ...current, ...updates }
  store.set('globalSettings', merged)
  res.json(merged)
})

export default router
