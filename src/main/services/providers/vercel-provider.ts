import {
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  DeployStatus
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'

const BASE_URL = 'https://api.vercel.com'

function mapDeployStatus(state: string): DeployStatus {
  switch (state?.toUpperCase()) {
    case 'READY':
      return 'live'
    case 'BUILDING':
      return 'building'
    case 'QUEUED':
      return 'queued'
    case 'ERROR':
      return 'failed'
    case 'CANCELED':
      return 'canceled'
    case 'INITIALIZING':
      return 'deploying'
    default:
      return 'unknown'
  }
}

export class VercelProvider implements PlatformProviderAdapter {
  readonly provider = 'vercel' as const

  private headers(creds: PlatformCredentials): Record<string, string> {
    return {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json'
    }
  }

  async testConnection(
    creds: PlatformCredentials
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/v2/user`, {
        headers: this.headers(creds)
      })
      if (!res.ok) {
        const text = await res.text()
        return { ok: false, error: `HTTP ${res.status}: ${text}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    const res = await fetch(`${BASE_URL}/v9/projects?limit=100`, {
      headers: this.headers(creds)
    })
    if (!res.ok) return []

    const data = (await res.json()) as Record<string, unknown>
    const projects = (data.projects as Array<Record<string, unknown>>) || []

    return projects.map((p) => {
      const targets = (p.targets as Record<string, unknown>) || {}
      const production = targets.production as Record<string, unknown>
      const url = production?.url || (p.latestDeployments as Array<Record<string, unknown>>)?.[0]?.url

      return {
        id: p.id as string,
        provider: 'vercel' as const,
        name: (p.name as string) || (p.id as string),
        url: url ? `https://${url}` : null,
        type: (p.framework as string) || 'static',
        region: null,
        createdAt: p.createdAt
          ? new Date(p.createdAt as number).toISOString()
          : new Date().toISOString()
      }
    })
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    const res = await fetch(
      `${BASE_URL}/v6/deployments?projectId=${serviceId}&limit=${limit}`,
      { headers: this.headers(creds) }
    )
    if (!res.ok) return []

    const data = (await res.json()) as Record<string, unknown>
    const deployments = (data.deployments as Array<Record<string, unknown>>) || []

    return deployments.map((d) => {
      const createdAt = d.createdAt
        ? new Date(d.createdAt as number).toISOString()
        : new Date().toISOString()
      const readyAt = d.ready ? new Date(d.ready as number).toISOString() : null
      let duration: number | null = null
      if (d.ready && d.buildingAt) {
        duration = Math.round(((d.ready as number) - (d.buildingAt as number)) / 1000)
      }

      const meta = (d.meta as Record<string, unknown>) || {}

      return {
        id: (d.uid as string) || (d.id as string),
        serviceId,
        provider: 'vercel' as const,
        status: mapDeployStatus(
          (d.readyState as string) || (d.state as string) || 'unknown'
        ),
        commitHash: (meta.githubCommitSha as string) || (meta.gitlabCommitSha as string) || null,
        commitMessage:
          (meta.githubCommitMessage as string) || (meta.gitlabCommitMessage as string) || null,
        branch:
          (meta.githubCommitRef as string) || (meta.gitlabCommitRef as string) || null,
        createdAt,
        finishedAt: readyAt,
        duration
      }
    })
  }

  async fetchDeployLogs(
    creds: PlatformCredentials,
    _serviceId: string,
    deployId: string
  ): Promise<string> {
    try {
      const res = await fetch(`${BASE_URL}/v3/deployments/${deployId}/events`, {
        headers: this.headers(creds)
      })
      if (!res.ok) return `Failed to fetch logs: HTTP ${res.status}`

      const data = await res.json()
      if (Array.isArray(data)) {
        return data
          .map(
            (e: Record<string, unknown>) =>
              `${e.date || ''} ${(e.payload as Record<string, unknown>)?.text || e.text || ''}`
          )
          .join('\n')
      }
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } catch {
      return 'Failed to fetch deploy logs'
    }
  }

  async fetchPerformanceMetrics(
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    try {
      // Vercel Web Analytics / Speed Insights
      const res = await fetch(
        `${BASE_URL}/v1/web/insights?projectId=${serviceId}&from=${Date.now() - 3600000}&to=${Date.now()}`,
        { headers: this.headers(creds) }
      )
      if (!res.ok) {
        return [
          {
            serviceId,
            provider: 'vercel',
            timestamp: new Date().toISOString(),
            responseTimeMs: null,
            requestCount: null,
            errorRate: null,
            bandwidthBytes: null,
            functionInvocations: null
          }
        ]
      }

      const data = (await res.json()) as Record<string, unknown>
      const datasets = (data.datasets as Array<Record<string, unknown>>) || []

      return [
        {
          serviceId,
          provider: 'vercel',
          timestamp: new Date().toISOString(),
          responseTimeMs: datasets.length > 0 ? (datasets[0].avg as number) || null : null,
          requestCount: (data.totalPageViews as number) || null,
          errorRate: null,
          bandwidthBytes: null,
          functionInvocations: null
        }
      ]
    } catch {
      return []
    }
  }

  async fetchResourceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    // Vercel is serverless — no CPU/memory metrics
    return [
      {
        serviceId,
        provider: 'vercel',
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

  async triggerRollback(
    creds: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      // Promote a previous deployment
      const res = await fetch(`${BASE_URL}/v13/deployments/${deployId}/promote`, {
        method: 'POST',
        headers: this.headers(creds),
        body: JSON.stringify({ projectId: serviceId })
      })
      if (!res.ok) {
        const text = await res.text()
        return { ok: false, error: `HTTP ${res.status}: ${text}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}
