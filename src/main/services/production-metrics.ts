import { EventEmitter } from 'node:events'
import {
  PlatformProvider,
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProviderStatus,
  ProductionMetricsSettings
} from '../../shared/types'
import { getProvider } from './providers'
import store from '../store'

const MAX_HISTORY = 60

export class ProductionMetricsService extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null
  private services = new Map<string, ProdService>()
  private deployments = new Map<string, ProdDeployment[]>()
  private performance = new Map<string, ProdPerformanceMetrics[]>()
  private resources = new Map<string, ProdResourceMetrics[]>()
  private providerStatuses = new Map<PlatformProvider, ProviderStatus>()

  // --- Credential Management ---

  getSettings(): ProductionMetricsSettings {
    return store.get('productionMetrics', {
      credentials: [],
      pollingIntervalMs: 30000,
      enabled: false
    })
  }

  private saveSettings(settings: ProductionMetricsSettings): void {
    store.set('productionMetrics', settings)
  }

  getCredentials(): PlatformCredentials[] {
    return this.getSettings().credentials
  }

  setCredentials(creds: PlatformCredentials): void {
    const settings = this.getSettings()
    const idx = settings.credentials.findIndex((c) => c.provider === creds.provider)
    if (idx >= 0) {
      settings.credentials[idx] = creds
    } else {
      settings.credentials.push(creds)
    }
    this.saveSettings(settings)
  }

  removeCredentials(provider: PlatformProvider): void {
    const settings = this.getSettings()
    settings.credentials = settings.credentials.filter((c) => c.provider !== provider)
    this.saveSettings(settings)
    this.providerStatuses.delete(provider)

    // Remove services for this provider
    for (const [id, svc] of this.services) {
      if (svc.provider === provider) {
        this.services.delete(id)
        this.deployments.delete(id)
        this.performance.delete(id)
        this.resources.delete(id)
      }
    }
  }

  // --- Connection Test ---

  async testConnection(provider: PlatformProvider): Promise<ProviderStatus> {
    const creds = this.getCredentials().find((c) => c.provider === provider)
    if (!creds) {
      const status: ProviderStatus = {
        provider,
        connectionStatus: 'error',
        error: 'No credentials configured',
        lastCheckedAt: new Date().toISOString(),
        serviceCount: 0
      }
      this.providerStatuses.set(provider, status)
      this.emit('provider-status-update', status)
      return status
    }

    const providerStatus: ProviderStatus = {
      provider,
      connectionStatus: 'checking',
      error: null,
      lastCheckedAt: new Date().toISOString(),
      serviceCount: 0
    }
    this.providerStatuses.set(provider, providerStatus)
    this.emit('provider-status-update', providerStatus)

    const adapter = getProvider(provider)
    const result = await adapter.testConnection(creds)

    const finalStatus: ProviderStatus = {
      provider,
      connectionStatus: result.ok ? 'connected' : 'error',
      error: result.error || null,
      lastCheckedAt: new Date().toISOString(),
      serviceCount: result.ok
        ? Array.from(this.services.values()).filter((s) => s.provider === provider).length
        : 0
    }
    this.providerStatuses.set(provider, finalStatus)
    this.emit('provider-status-update', finalStatus)
    return finalStatus
  }

  // --- Data Fetching ---

  async fetchAllForProvider(creds: PlatformCredentials): Promise<void> {
    const adapter = getProvider(creds.provider)

    try {
      // Fetch services
      const services = await adapter.fetchServices(creds)
      for (const svc of services) {
        this.services.set(svc.id, svc)
      }
      this.emit('services-update', this.getServices())

      // Update provider status
      const status: ProviderStatus = {
        provider: creds.provider,
        connectionStatus: 'connected',
        error: null,
        lastCheckedAt: new Date().toISOString(),
        serviceCount: services.length
      }
      this.providerStatuses.set(creds.provider, status)
      this.emit('provider-status-update', status)

      // Fetch deployments, performance, resources for each service
      const providerServices = services.slice(0, 10) // cap at 10 per provider per poll
      await Promise.allSettled(
        providerServices.map(async (svc) => {
          try {
            const deploys = await adapter.fetchDeployments(creds, svc.id, 10)
            this.deployments.set(svc.id, deploys)
            this.emit('deployments-update', { serviceId: svc.id, deployments: deploys })
          } catch {
            // ignore per-service errors
          }

          try {
            const perf = await adapter.fetchPerformanceMetrics(creds, svc.id)
            const existing = this.performance.get(svc.id) || []
            const merged = [...existing, ...perf].slice(-MAX_HISTORY)
            this.performance.set(svc.id, merged)
            this.emit('performance-update', { serviceId: svc.id, metrics: merged })
          } catch {
            // ignore
          }

          try {
            const res = await adapter.fetchResourceMetrics(creds, svc.id)
            const existing = this.resources.get(svc.id) || []
            const merged = [...existing, ...res].slice(-MAX_HISTORY)
            this.resources.set(svc.id, merged)
            this.emit('resources-update', { serviceId: svc.id, metrics: merged })
          } catch {
            // ignore
          }
        })
      )
    } catch (err) {
      const status: ProviderStatus = {
        provider: creds.provider,
        connectionStatus: 'error',
        error: (err as Error).message,
        lastCheckedAt: new Date().toISOString(),
        serviceCount: 0
      }
      this.providerStatuses.set(creds.provider, status)
      this.emit('provider-status-update', status)
    }
  }

  async fetchDeployLogs(
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ): Promise<string> {
    const creds = this.getCredentials().find((c) => c.provider === provider)
    if (!creds) return 'No credentials for this provider'
    const adapter = getProvider(provider)
    return adapter.fetchDeployLogs(creds, serviceId, deployId)
  }

  async triggerRollback(
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const creds = this.getCredentials().find((c) => c.provider === provider)
    if (!creds) return { ok: false, error: 'No credentials for this provider' }
    const adapter = getProvider(provider)
    return adapter.triggerRollback(creds, serviceId, deployId)
  }

  // --- Polling ---

  start(intervalMs?: number): void {
    this.stop()
    const interval = intervalMs || this.getSettings().pollingIntervalMs || 30000
    this.pollAll()
    this.pollInterval = setInterval(() => this.pollAll(), interval)
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private async pollAll(): Promise<void> {
    const creds = this.getCredentials().filter((c) => c.enabled)
    await Promise.allSettled(creds.map((c) => this.fetchAllForProvider(c)))
  }

  // --- Getters ---

  getServices(): ProdService[] {
    return Array.from(this.services.values())
  }

  getDeployments(serviceId: string): ProdDeployment[] {
    return this.deployments.get(serviceId) || []
  }

  getPerformance(serviceId: string): ProdPerformanceMetrics[] {
    return this.performance.get(serviceId) || []
  }

  getResources(serviceId: string): ProdResourceMetrics[] {
    return this.resources.get(serviceId) || []
  }

  getProviderStatuses(): Record<string, ProviderStatus> {
    const result: Record<string, ProviderStatus> = {}
    for (const [key, val] of this.providerStatuses) {
      result[key] = val
    }
    return result
  }

  shutdown(): void {
    this.stop()
  }
}

export const productionMetrics = new ProductionMetricsService()
