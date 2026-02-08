import {
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  DeployStatus
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'

const BASE_URL = 'https://api.render.com/v1'

function mapDeployStatus(status: string): DeployStatus {
  switch (status) {
    case 'live':
      return 'live'
    case 'build_in_progress':
    case 'update_in_progress':
    case 'pre_deploy_in_progress':
      return 'building'
    case 'build_failed':
    case 'update_failed':
    case 'pre_deploy_failed':
      return 'failed'
    case 'canceled':
      return 'canceled'
    case 'deactivated':
      return 'unknown'
    default:
      return 'unknown'
  }
}

export class RenderProvider implements PlatformProviderAdapter {
  readonly provider = 'render' as const

  private headers(creds: PlatformCredentials): Record<string, string> {
    return {
      Authorization: `Bearer ${creds.token}`,
      Accept: 'application/json'
    }
  }

  async testConnection(
    creds: PlatformCredentials
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/services?limit=1`, {
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
    const services: ProdService[] = []
    let cursor: string | undefined

    for (let page = 0; page < 5; page++) {
      const url = cursor
        ? `${BASE_URL}/services?limit=100&cursor=${cursor}`
        : `${BASE_URL}/services?limit=100`

      const res = await fetch(url, { headers: this.headers(creds) })
      if (!res.ok) break

      const data = await res.json()
      const items = Array.isArray(data) ? data : data.services || []
      if (items.length === 0) break

      for (const item of items) {
        const svc = item.service || item
        services.push({
          id: svc.id,
          provider: 'render',
          name: svc.name || svc.slug || svc.id,
          url: svc.serviceDetails?.url || null,
          type: svc.type || 'web_service',
          region: svc.region || null,
          createdAt: svc.createdAt || new Date().toISOString()
        })
      }

      cursor = items[items.length - 1]?.cursor
      if (!cursor) break
    }

    return services
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    const res = await fetch(
      `${BASE_URL}/services/${serviceId}/deploys?limit=${limit}`,
      { headers: this.headers(creds) }
    )
    if (!res.ok) return []

    const data = await res.json()
    const items = Array.isArray(data) ? data : data.deploys || []

    return items.map((item: Record<string, unknown>) => {
      const deploy = (item as Record<string, unknown>).deploy || item
      const d = deploy as Record<string, unknown>
      const createdAt = (d.createdAt as string) || new Date().toISOString()
      const finishedAt = (d.finishedAt as string) || null
      let duration: number | null = null
      if (finishedAt) {
        duration = Math.round(
          (new Date(finishedAt).getTime() - new Date(createdAt).getTime()) / 1000
        )
      }

      return {
        id: d.id as string,
        serviceId,
        provider: 'render' as const,
        status: mapDeployStatus((d.status as string) || 'unknown'),
        commitHash: (d.commit?.id as string) || (d.commitId as string) || null,
        commitMessage: (d.commit?.message as string) || null,
        branch: (d.branch as string) || null,
        createdAt,
        finishedAt,
        duration
      }
    })
  }

  async fetchDeployLogs(
    creds: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<string> {
    const res = await fetch(
      `${BASE_URL}/services/${serviceId}/deploys/${deployId}/logs`,
      { headers: this.headers(creds) }
    )
    if (!res.ok) return `Failed to fetch logs: HTTP ${res.status}`

    const data = await res.json()
    if (Array.isArray(data)) {
      return data.map((entry: Record<string, unknown>) => entry.message || entry.text || '').join('\n')
    }
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }

  async fetchPerformanceMetrics(
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    try {
      const res = await fetch(
        `${BASE_URL}/services/${serviceId}/metrics/bandwidth?resolution=hour&start=${new Date(Date.now() - 3600000).toISOString()}`,
        { headers: this.headers(creds) }
      )
      if (!res.ok) return []

      const data = await res.json()
      const points = Array.isArray(data) ? data : data.metrics || []

      return points.map((p: Record<string, unknown>) => ({
        serviceId,
        provider: 'render' as const,
        timestamp: (p.timestamp as string) || new Date().toISOString(),
        responseTimeMs: null,
        requestCount: null,
        errorRate: null,
        bandwidthBytes: (p.value as number) || null,
        functionInvocations: null
      }))
    } catch {
      return []
    }
  }

  async fetchResourceMetrics(
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    const metrics: ProdResourceMetrics[] = []

    try {
      for (const metric of ['cpu', 'memory']) {
        const res = await fetch(
          `${BASE_URL}/services/${serviceId}/metrics/${metric}?resolution=hour&start=${new Date(Date.now() - 3600000).toISOString()}`,
          { headers: this.headers(creds) }
        )
        if (!res.ok) continue

        const data = await res.json()
        const points = Array.isArray(data) ? data : data.metrics || []

        for (const p of points) {
          const existing = metrics.find((m) => m.timestamp === p.timestamp)
          const value = (p.value as number) || null
          if (existing) {
            if (metric === 'cpu') existing.cpuPercent = value
            else existing.memoryPercent = value
          } else {
            metrics.push({
              serviceId,
              provider: 'render',
              timestamp: (p.timestamp as string) || new Date().toISOString(),
              cpuPercent: metric === 'cpu' ? value : null,
              memoryPercent: metric === 'memory' ? value : null,
              memoryUsedBytes: null,
              memoryLimitBytes: null,
              diskUsedBytes: null,
              diskLimitBytes: null
            })
          }
        }
      }
    } catch {
      // ignore
    }

    return metrics
  }

  async triggerRollback(
    creds: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/services/${serviceId}/deploys/${deployId}/rollbacks`, {
        method: 'POST',
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
}
