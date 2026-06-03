import {
  DeployStatus,
  PlatformCredentials,
  PlatformProvider,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProdService
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'

interface SimpleTokenProviderOptions {
  provider: Exclude<PlatformProvider, 'aws'>
  baseUrl: string
  authHeader: (token: string) => Record<string, string>
  testPath: string
  servicesPath: string
  deploymentsPath?: (serviceId: string, limit: number) => string
  parseServices: (data: unknown) => ProdService[]
  parseDeployments?: (data: unknown, serviceId: string) => ProdDeployment[]
  logsPath?: (serviceId: string, deployId: string) => string
}

export class SimpleTokenProvider implements PlatformProviderAdapter {
  readonly provider: Exclude<PlatformProvider, 'aws'>
  private options: SimpleTokenProviderOptions

  constructor(options: SimpleTokenProviderOptions) {
    this.provider = options.provider
    this.options = options
  }

  private headers(creds: PlatformCredentials): Record<string, string> {
    return {
      ...this.options.authHeader(creds.token),
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }

  private async getJson(creds: PlatformCredentials, path: string): Promise<unknown> {
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      headers: this.headers(creds)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res.json()
  }

  async testConnection(creds: PlatformCredentials): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.getJson(creds, this.options.testPath)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    try {
      return this.options.parseServices(await this.getJson(creds, this.options.servicesPath))
    } catch {
      return []
    }
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    if (!this.options.deploymentsPath || !this.options.parseDeployments) return []
    try {
      const data = await this.getJson(creds, this.options.deploymentsPath(serviceId, limit))
      return this.options.parseDeployments(data, serviceId)
    } catch {
      return []
    }
  }

  async fetchDeployLogs(
    creds: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<string> {
    if (!this.options.logsPath) return 'Deploy logs are not available for this provider yet'
    try {
      const data = await this.getJson(creds, this.options.logsPath(serviceId, deployId))
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } catch (err) {
      return `Failed to fetch logs: ${(err as Error).message}`
    }
  }

  async fetchPerformanceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    return [
      {
        serviceId,
        provider: this.provider,
        timestamp: new Date().toISOString(),
        responseTimeMs: null,
        requestCount: null,
        errorRate: null,
        bandwidthBytes: null,
        functionInvocations: null
      }
    ]
  }

  async fetchResourceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    return [
      {
        serviceId,
        provider: this.provider,
        timestamp: new Date().toISOString(),
        cpuPercent: null,
        memoryPercent: null,
        memoryUsedBytes: null,
        memoryLimitBytes: null,
        diskUsedBytes: null,
        diskLimitBytes: null
      }
    ]
  }

  async triggerRollback(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: 'Rollback is not available for this provider yet' }
  }
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function asDate(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return new Date().toISOString()
}

export function mapCommonDeployStatus(value: unknown): DeployStatus {
  const status = String(value || '').toLowerCase()
  if (['ready', 'success', 'succeeded', 'active', 'live', 'deployed', 'complete'].includes(status)) return 'live'
  if (['building', 'build_in_progress'].includes(status)) return 'building'
  if (['deploying', 'pending', 'in_progress', 'running'].includes(status)) return 'deploying'
  if (['queued', 'created'].includes(status)) return 'queued'
  if (['error', 'failed', 'failure'].includes(status)) return 'failed'
  if (['canceled', 'cancelled'].includes(status)) return 'canceled'
  return 'unknown'
}
