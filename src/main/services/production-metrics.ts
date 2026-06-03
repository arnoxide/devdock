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
  private providerStatuses = new Map<string, ProviderStatus>()

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
    const settings = this.getSettings()
    const normalized = settings.credentials.map((creds) => normalizeCredentials(creds))
    const changed = normalized.some((creds, index) =>
      creds.id !== settings.credentials[index].id ||
      creds.accountName !== settings.credentials[index].accountName
    )
    if (changed) {
      this.saveSettings({ ...settings, credentials: normalized })
    }
    return normalized
  }

  setCredentials(creds: PlatformCredentials): void {
    const settings = this.getSettings()
    const normalized = normalizeCredentials(creds)
    const idx = settings.credentials.findIndex((c) => getCredentialId(c) === normalized.id)
    if (idx >= 0) {
      settings.credentials[idx] = normalized
    } else {
      settings.credentials.push(normalized)
    }
    this.saveSettings(settings)
  }

  removeCredentials(provider: PlatformProvider, accountId?: string): void {
    const settings = this.getSettings()
    const targetId = accountId || legacyCredentialId(provider)
    settings.credentials = settings.credentials.filter((c) => getCredentialId(c) !== targetId)
    this.saveSettings(settings)
    this.providerStatuses.delete(targetId)

    // Remove services for this account.
    for (const [id, svc] of this.services) {
      if (svc.provider === provider && getServiceAccountId(svc) === targetId) {
        this.services.delete(id)
        this.deployments.delete(id)
        this.performance.delete(id)
        this.resources.delete(id)
      }
    }
  }

  // --- Connection Test ---

  async testConnection(provider: PlatformProvider, accountId?: string): Promise<ProviderStatus> {
    const creds = this.findCredentials(provider, accountId)
    const statusKey = accountId || legacyCredentialId(provider)
    if (!creds) {
      const status: ProviderStatus = {
        provider,
        accountId: statusKey,
        accountName: accountId,
        connectionStatus: 'error',
        error: 'No credentials configured',
        lastCheckedAt: new Date().toISOString(),
        serviceCount: 0
      }
      this.providerStatuses.set(statusKey, status)
      this.emit('provider-status-update', status)
      return status
    }

    const providerStatus: ProviderStatus = {
      provider,
      accountId: creds.id,
      accountName: creds.accountName,
      connectionStatus: 'checking',
      error: null,
      lastCheckedAt: new Date().toISOString(),
      serviceCount: 0
    }
    this.providerStatuses.set(creds.id!, providerStatus)
    this.emit('provider-status-update', providerStatus)

    const adapter = getProvider(provider)
    const result = await adapter.testConnection(creds)

    const finalStatus: ProviderStatus = {
      provider,
      accountId: creds.id,
      accountName: creds.accountName,
      connectionStatus: result.ok ? 'connected' : 'error',
      error: result.error || null,
      lastCheckedAt: new Date().toISOString(),
      serviceCount: result.ok
        ? Array.from(this.services.values()).filter((s) => getServiceAccountId(s) === creds.id).length
        : 0
    }
    this.providerStatuses.set(creds.id!, finalStatus)
    this.emit('provider-status-update', finalStatus)
    return finalStatus
  }

  // --- Data Fetching ---

  async fetchAllForProvider(creds: PlatformCredentials): Promise<void> {
    const adapter = getProvider(creds.provider)

    try {
      // Fetch services
      const accountId = getCredentialId(creds)
      const services = await adapter.fetchServices(creds)
      const normalizedServices = services.map((svc) => namespaceService(svc, creds))
      for (const svc of normalizedServices) {
        this.services.set(svc.id, svc)
      }
      this.emit('services-update', this.getServices())

      // Update provider status
      const status: ProviderStatus = {
        provider: creds.provider,
        accountId,
        accountName: creds.accountName,
        connectionStatus: 'connected',
        error: null,
        lastCheckedAt: new Date().toISOString(),
        serviceCount: normalizedServices.length
      }
      this.providerStatuses.set(accountId, status)
      this.emit('provider-status-update', status)

      // Fetch deployments, performance, resources for each service
      const providerServices = normalizedServices.slice(0, 10) // cap at 10 per account per poll
      await Promise.allSettled(
        providerServices.map(async (svc) => {
          const originalServiceId = svc.originalId || svc.id
          try {
            const deploys = (await adapter.fetchDeployments(creds, originalServiceId, 10))
              .map((deploy) => ({ ...deploy, serviceId: svc.id }))
            this.deployments.set(svc.id, deploys)
            this.emit('deployments-update', { serviceId: svc.id, deployments: deploys })
          } catch {
            // ignore per-service errors
          }

          try {
            const perf = (await adapter.fetchPerformanceMetrics(creds, originalServiceId))
              .map((metric) => ({ ...metric, serviceId: svc.id }))
            const existing = this.performance.get(svc.id) || []
            const merged = [...existing, ...perf].slice(-MAX_HISTORY)
            this.performance.set(svc.id, merged)
            this.emit('performance-update', { serviceId: svc.id, metrics: merged })
          } catch {
            // ignore
          }

          try {
            const res = (await adapter.fetchResourceMetrics(creds, originalServiceId))
              .map((metric) => ({ ...metric, serviceId: svc.id }))
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
        accountId: getCredentialId(creds),
        accountName: creds.accountName,
        connectionStatus: 'error',
        error: (err as Error).message,
        lastCheckedAt: new Date().toISOString(),
        serviceCount: 0
      }
      this.providerStatuses.set(getCredentialId(creds), status)
      this.emit('provider-status-update', status)
    }
  }

  async fetchDeployLogs(
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ): Promise<string> {
    const service = this.services.get(serviceId)
    const creds = this.findCredentials(provider, service?.accountId)
    if (!creds) return 'No credentials for this provider'
    const adapter = getProvider(provider)
    return adapter.fetchDeployLogs(creds, service?.originalId || serviceId, deployId)
  }

  async triggerRollback(
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const service = this.services.get(serviceId)
    const creds = this.findCredentials(provider, service?.accountId)
    if (!creds) return { ok: false, error: 'No credentials for this provider' }
    const adapter = getProvider(provider)
    return adapter.triggerRollback(creds, service?.originalId || serviceId, deployId)
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

  private findCredentials(provider: PlatformProvider, accountId?: string): PlatformCredentials | undefined {
    const credentials = this.getCredentials().filter((c) => c.provider === provider)
    if (accountId) return credentials.find((c) => c.id === accountId)
    return credentials[0]
  }
}

export const productionMetrics = new ProductionMetricsService()

function legacyCredentialId(provider: PlatformProvider): string {
  return `${provider}:default`
}

function getCredentialId(creds: PlatformCredentials): string {
  return creds.id || legacyCredentialId(creds.provider)
}

function normalizeCredentials(creds: PlatformCredentials): PlatformCredentials {
  const id = getCredentialId(creds)
  return {
    ...creds,
    id,
    accountName: creds.accountName?.trim() || 'Default account'
  }
}

function namespaceService(service: ProdService, creds: PlatformCredentials): ProdService {
  const accountId = getCredentialId(creds)
  return {
    ...service,
    id: `${accountId}:${service.id}`,
    originalId: service.originalId || service.id,
    accountId,
    accountName: creds.accountName || 'Default account'
  }
}

function getServiceAccountId(service: ProdService): string {
  return service.accountId || legacyCredentialId(service.provider)
}
