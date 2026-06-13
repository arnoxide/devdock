import store from '../store'
import { dbMonitor } from './db-monitor'
import { gitService } from './git-service'
import { processManager } from './process-manager'
import { productionMetrics } from './production-metrics'
import { getDetectedRuntimes } from '../../remote/runtime-detector'
import { GlobalSettings, ProjectConfig } from '../../shared/types'

type CloudSyncConfig = NonNullable<GlobalSettings['cloudSync']>

interface CloudSyncStatus {
  enabled: boolean
  running: boolean
  configured: boolean
  hubUrl: string
  intervalMs: number
  hasAgentToken: boolean
  lastSyncAt: string | null
  lastError: string | null
}

const DEFAULT_CONFIG: CloudSyncConfig = {
  enabled: false,
  hubUrl: '',
  intervalMs: 60000
}

function trimUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
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

export class CloudSyncService {
  private timer: NodeJS.Timeout | null = null
  private running = false
  private lastSyncAt: string | null = null
  private lastError: string | null = null

  getConfig(): CloudSyncConfig {
    const settings = store.get('globalSettings') as GlobalSettings
    return { ...DEFAULT_CONFIG, ...(settings.cloudSync || {}) }
  }

  getAgentToken(): string {
    return (store.get('cloudSyncAgentToken' as any, '') as string) || ''
  }

  getStatus(): CloudSyncStatus {
    const config = this.getConfig()
    const token = this.getAgentToken()
    return {
      enabled: !!config.enabled,
      running: this.running,
      configured: !!(config.hubUrl && token),
      hubUrl: config.hubUrl,
      intervalMs: config.intervalMs,
      hasAgentToken: !!token,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError
    }
  }

  updateConfig(update: Partial<CloudSyncConfig> & { agentToken?: string }): CloudSyncStatus {
    const currentSettings = store.get('globalSettings') as GlobalSettings
    const currentConfig = this.getConfig()
    const nextConfig: CloudSyncConfig = {
      ...currentConfig,
      ...update,
      hubUrl: update.hubUrl !== undefined ? trimUrl(update.hubUrl) : currentConfig.hubUrl,
      intervalMs: Math.max(15000, Number(update.intervalMs || currentConfig.intervalMs || 60000))
    }

    store.set('globalSettings', { ...currentSettings, cloudSync: nextConfig })
    if (update.agentToken !== undefined && update.agentToken.trim()) {
      store.set('cloudSyncAgentToken' as any, update.agentToken.trim())
    }

    if (nextConfig.enabled) this.start()
    else this.stop()

    return this.getStatus()
  }

  start(): void {
    const config = this.getConfig()
    if (!config.enabled || !config.hubUrl || !this.getAgentToken()) return
    this.stop()
    this.running = true
    this.syncNow().catch(() => undefined)
    this.timer = setInterval(() => this.syncNow().catch(() => undefined), config.intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.running = false
  }

  async syncNow(): Promise<CloudSyncStatus> {
    const config = this.getConfig()
    const token = this.getAgentToken()
    if (!config.hubUrl || !token) throw new Error('Cloud Sync is missing Hub URL or agent token')

    try {
      await this.hubFetch('/api/agent/heartbeat', { method: 'POST', body: JSON.stringify({ metadata: { platform: process.platform, hostname: process.env.HOSTNAME || '' } }) })
      await this.syncProjects()
      await this.syncProcesses()
      await this.syncGit()
      await this.syncProduction()
      await this.syncDatabases()
      await this.pollCommands()
      this.lastSyncAt = new Date().toISOString()
      this.lastError = null
    } catch (err: any) {
      this.lastError = err.message || 'Cloud sync failed'
      throw err
    }

    return this.getStatus()
  }

  private async hubFetch(path: string, options: RequestInit = {}): Promise<any> {
    const config = this.getConfig()
    const token = this.getAgentToken()
    const url = `${trimUrl(config.hubUrl)}${path}`
    const res = await withTimeout(fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...((options.headers as Record<string, string>) || {})
      }
    }), 20000, 'Cloud Hub request timed out')

    const text = await res.text()
    let data: any = {}
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160)
        const contentType = res.headers.get('content-type') || 'unknown content type'
        throw new Error(`Cloud Hub returned non-JSON from ${url} (${res.status}, ${contentType}): ${snippet}`)
      }
    }
    if (!res.ok) throw new Error(data.error || `Cloud Hub HTTP ${res.status}`)
    return data
  }

  private getProjects(): ProjectConfig[] {
    return store.get('projects', []) as ProjectConfig[]
  }

  private async syncProjects(): Promise<void> {
    const projects = this.getProjects()
    const runtimes = await getDetectedRuntimes(projects)
    await this.hubFetch('/api/agent/projects', {
      method: 'PUT',
      body: JSON.stringify({
        projects: projects.map((project) => ({
          ...project,
          status: runtimes[project.id]?.status || 'idle',
          port: runtimes[project.id]?.port || null,
          external: !!runtimes[project.id]?.external
        }))
      })
    })
  }

  private async syncProcesses(): Promise<void> {
    const projects = this.getProjects().filter((project) => !project.isGroup)
    const runtimes = await getDetectedRuntimes(projects)
    await this.hubFetch('/api/agent/processes', {
      method: 'PUT',
      body: JSON.stringify({
        processes: projects.map((project) => ({
          projectId: project.id,
          runtime: runtimes[project.id] || processManager.getRuntime(project.id),
          output: processManager.getOutputBuffer(project.id).slice(-40)
        }))
      })
    })
  }

  private async syncGit(): Promise<void> {
    const projects = this.getProjects().filter((project) => !project.isGroup)
    const repos = await Promise.all(projects.map(async (project) => {
      try {
        const status = await gitService.getStatus(project.path)
        return {
          projectId: project.id,
          branch: status.branch,
          changes: [...status.staged, ...status.unstaged, ...status.untracked],
          commits: status.lastCommit ? [status.lastCommit] : [],
          error: status.isRepo ? null : 'Not a git repository'
        }
      } catch (err: any) {
        return { projectId: project.id, branch: null, changes: [], commits: [], error: err.message || 'Git status failed' }
      }
    }))

    await this.hubFetch('/api/agent/git', { method: 'PUT', body: JSON.stringify({ repos }) })
  }

  private async syncProduction(): Promise<void> {
    const services = productionMetrics.getServices()
    await this.hubFetch('/api/agent/production', {
      method: 'PUT',
      body: JSON.stringify({
        services: services.map((service) => ({
          service,
          deployments: productionMetrics.getDeployments(service.id),
          performance: productionMetrics.getPerformance(service.id),
          resources: productionMetrics.getResources(service.id)
        }))
      })
    })
  }

  private async syncDatabases(): Promise<void> {
    const connections = dbMonitor.getAllConfigs()
    const databases = await Promise.all(connections.map(async (connection) => {
      const status = dbMonitor.getStatus(connection.id)
      let tables: any[] = []
      try {
        if (status.status === 'connected') {
          tables = await withTimeout(dbMonitor.listTables(connection.id), 5000, 'List tables timed out')
        }
      } catch {
        tables = []
      }

      return {
        id: connection.id,
        name: connection.name,
        type: connection.type,
        status: status.status,
        tables,
        metadata: {
          projectId: connection.projectId,
          error: status.error,
          latencyMs: status.latencyMs,
          serverVersion: status.serverVersion
        }
      }
    }))

    await this.hubFetch('/api/agent/databases', { method: 'PUT', body: JSON.stringify({ databases }) })
  }

  private async pollCommands(): Promise<void> {
    const data = await this.hubFetch('/api/agent/commands')
    const commands = Array.isArray(data.commands) ? data.commands : []
    for (const command of commands) {
      try {
        const result = await this.executeCommand(command)
        await this.hubFetch(`/api/agent/commands/${command.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed', result })
        })
      } catch (err: any) {
        await this.hubFetch(`/api/agent/commands/${command.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'failed', result: { error: err.message || 'Command failed' } })
        })
      }
    }
  }

  private async executeCommand(command: any): Promise<Record<string, unknown>> {
    const targetId = command.target_id || command.targetId
    if (!targetId) throw new Error('Command target id is required')

    if (command.target_type === 'project') {
      if (command.action === 'start') {
        const project = this.getProjects().find((p) => p.id === targetId)
        if (!project) throw new Error('Project not found')
        await processManager.start(project.id, command.payload?.command || project.startCommand, project.path)
        return { ok: true }
      }
      if (command.action === 'stop') {
        await processManager.stop(targetId)
        return { ok: true }
      }
      if (command.action === 'restart') {
        await processManager.restart(targetId)
        return { ok: true }
      }
    }

    if (command.target_type === 'git') {
      const project = this.getProjects().find((p) => p.id === targetId)
      if (!project) throw new Error('Project not found')
      if (command.action === 'pull') return await gitService.pull(project.path)
      if (command.action === 'push') return await gitService.push(project.path)
    }

    throw new Error(`Unsupported command: ${command.target_type}:${command.action}`)
  }
}

export const cloudSyncService = new CloudSyncService()
