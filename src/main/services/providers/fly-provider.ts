import {
  PlatformCredentials,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProdService
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'
import { asDate, mapCommonDeployStatus } from './simple-token-provider'

const GQL_URL = 'https://api.fly.io/graphql'

export class FlyProvider implements PlatformProviderAdapter {
  readonly provider = 'fly' as const

  private async gql(
    creds: PlatformCredentials,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const res = await fetch(GQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    })
    if (!res.ok) throw new Error(`Fly.io API: HTTP ${res.status}`)
    const json = (await res.json()) as Record<string, unknown>
    if (json.errors) {
      const errors = json.errors as Array<{ message: string }>
      throw new Error(errors[0]?.message || 'GraphQL error')
    }
    return (json.data as Record<string, unknown>) || {}
  }

  async testConnection(creds: PlatformCredentials): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.gql(creds, '{ viewer { id name email } }')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    try {
      const data = await this.gql(
        creds,
        `{
          apps {
            nodes {
              id
              name
              hostname
              status
              organization { slug }
            }
          }
        }`
      )
      const apps = ((data.apps as Record<string, unknown>)?.nodes as Array<Record<string, unknown>>) || []
      return apps.map((app) => ({
        id: String(app.name || app.id),
        provider: 'fly',
        name: String(app.name || app.id),
        url: app.hostname ? `https://${app.hostname}` : `https://${app.name}.fly.dev`,
        type: String(app.status || 'app'),
        region: String((app.organization as Record<string, unknown>)?.slug || ''),
        createdAt: new Date().toISOString()
      }))
    } catch {
      return []
    }
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    try {
      const data = await this.gql(
        creds,
        `query($name: String!) {
          app(name: $name) {
            releases {
              nodes {
                id
                version
                status
                description
                createdAt
              }
            }
          }
        }`,
        { name: serviceId }
      )
      const releases = (((data.app as Record<string, unknown>)?.releases as Record<string, unknown>)?.nodes as Array<Record<string, unknown>>) || []
      return releases.slice(0, limit).map((release) => ({
        id: String(release.id || release.version),
        serviceId,
        provider: 'fly',
        status: mapCommonDeployStatus(release.status),
        commitHash: null,
        commitMessage: String(release.description || ''),
        branch: null,
        createdAt: asDate(release.createdAt),
        finishedAt: null,
        duration: null
      }))
    } catch {
      return []
    }
  }

  async fetchDeployLogs(): Promise<string> {
    return 'Deploy logs are not available for Fly.io yet'
  }

  async fetchPerformanceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    return [{
      serviceId,
      provider: 'fly',
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
      provider: 'fly',
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
    return { ok: false, error: 'Rollback is not available for Fly.io yet' }
  }
}
