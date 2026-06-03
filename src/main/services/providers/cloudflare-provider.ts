import {
  PlatformCredentials,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProdService
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'
import { asDate, asString, mapCommonDeployStatus } from './simple-token-provider'

const BASE_URL = 'https://api.cloudflare.com/client/v4'

export class CloudflareProvider implements PlatformProviderAdapter {
  readonly provider = 'cloudflare' as const

  private headers(creds: PlatformCredentials): Record<string, string> {
    return {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json'
    }
  }

  private async getJson(creds: PlatformCredentials, path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: this.headers(creds) })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res.json() as Promise<Record<string, unknown>>
  }

  async testConnection(creds: PlatformCredentials): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.getJson(creds, '/user/tokens/verify')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    try {
      const accountsData = await this.getJson(creds, '/accounts')
      const accounts = (accountsData.result as Array<Record<string, unknown>>) || []
      const services: ProdService[] = []

      for (const account of accounts.slice(0, 10)) {
        const accountId = String(account.id)
        const projectsData = await this.getJson(creds, `/accounts/${accountId}/pages/projects`)
        const projects = (projectsData.result as Array<Record<string, unknown>>) || []
        for (const project of projects) {
          services.push({
            id: `${accountId}:${project.name}`,
            provider: 'cloudflare',
            name: asString(project.name) || String(project.id),
            url: asString(project.subdomain) || null,
            type: 'pages',
            region: asString(account.name),
            createdAt: asDate(project.created_on)
          })
        }
      }

      return services
    } catch {
      return []
    }
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    const [accountId, projectName] = serviceId.split(':')
    if (!accountId || !projectName) return []
    try {
      const data = await this.getJson(
        creds,
        `/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=${limit}`
      )
      const deployments = (data.result as Array<Record<string, unknown>>) || []
      return deployments.map((deployment) => {
        const source = (deployment.source as Record<string, unknown>) || {}
        const config = (source.config as Record<string, unknown>) || {}
        return {
          id: String(deployment.id),
          serviceId,
          provider: 'cloudflare',
          status: mapCommonDeployStatus(deployment.latest_stage?.status || deployment.stage),
          commitHash: asString(config.commit_hash),
          commitMessage: asString(config.commit_message),
          branch: asString(deployment.deployment_trigger?.metadata?.branch),
          createdAt: asDate(deployment.created_on),
          finishedAt: asString(deployment.modified_on),
          duration: null
        }
      })
    } catch {
      return []
    }
  }

  async fetchDeployLogs(): Promise<string> {
    return 'Deploy logs are not available for Cloudflare Pages yet'
  }

  async fetchPerformanceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    return [{
      serviceId,
      provider: 'cloudflare',
      timestamp: new Date().toISOString(),
      responseTimeMs: null,
      requestCount: null,
      errorRate: null,
      bandwidthBytes: null,
      functionInvocations: null
    }]
  }

  async fetchResourceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    return [{
      serviceId,
      provider: 'cloudflare',
      timestamp: new Date().toISOString(),
      cpuPercent: null,
      memoryPercent: null,
      memoryUsedBytes: null,
      memoryLimitBytes: null,
      diskUsedBytes: null,
      diskLimitBytes: null
    }]
  }

  async triggerRollback(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: 'Rollback is not available for Cloudflare Pages yet' }
  }
}
