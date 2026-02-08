import {
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  DeployStatus
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'

const GQL_URL = 'https://backboard.railway.app/graphql/v2'

function mapDeployStatus(status: string): DeployStatus {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
      return 'live'
    case 'BUILDING':
      return 'building'
    case 'DEPLOYING':
      return 'deploying'
    case 'FAILED':
    case 'CRASHED':
      return 'failed'
    case 'REMOVING':
    case 'REMOVED':
      return 'canceled'
    case 'QUEUED':
    case 'WAITING':
    case 'INITIALIZING':
      return 'queued'
    default:
      return 'unknown'
  }
}

export class RailwayProvider implements PlatformProviderAdapter {
  readonly provider = 'railway' as const

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
    if (!res.ok) throw new Error(`Railway API: HTTP ${res.status}`)
    const json = (await res.json()) as Record<string, unknown>
    if (json.errors) {
      const errors = json.errors as Array<{ message: string }>
      throw new Error(errors[0]?.message || 'GraphQL error')
    }
    return (json.data as Record<string, unknown>) || {}
  }

  async testConnection(
    creds: PlatformCredentials
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.gql(creds, '{ me { id name } }')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    const data = await this.gql(
      creds,
      `{
        projects {
          edges {
            node {
              id
              name
              createdAt
              services {
                edges {
                  node {
                    id
                    name
                    createdAt
                  }
                }
              }
              environments {
                edges {
                  node {
                    id
                    name
                    serviceInstances {
                      edges {
                        node {
                          serviceId
                          domains {
                            serviceDomains {
                              domain
                            }
                          }
                          region
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`
    )

    const services: ProdService[] = []
    const projects = data.projects as Record<string, unknown>
    const edges = (projects?.edges as Array<Record<string, unknown>>) || []

    for (const edge of edges) {
      const project = edge.node as Record<string, unknown>
      const svcEdges =
        ((project.services as Record<string, unknown>)?.edges as Array<
          Record<string, unknown>
        >) || []

      // Build a map of serviceId -> domain/region from environments
      const domainMap = new Map<string, { domain: string | null; region: string | null }>()
      const envEdges =
        ((project.environments as Record<string, unknown>)?.edges as Array<
          Record<string, unknown>
        >) || []
      for (const envEdge of envEdges) {
        const env = envEdge.node as Record<string, unknown>
        const siEdges =
          ((env.serviceInstances as Record<string, unknown>)?.edges as Array<
            Record<string, unknown>
          >) || []
        for (const siEdge of siEdges) {
          const si = siEdge.node as Record<string, unknown>
          const svcId = si.serviceId as string
          const domains = si.domains as Record<string, unknown>
          const svcDomains = (domains?.serviceDomains as Array<Record<string, unknown>>) || []
          const domain = svcDomains[0]?.domain as string | null
          domainMap.set(svcId, { domain, region: (si.region as string) || null })
        }
      }

      for (const svcEdge of svcEdges) {
        const svc = svcEdge.node as Record<string, unknown>
        const info = domainMap.get(svc.id as string)
        services.push({
          id: svc.id as string,
          provider: 'railway',
          name: `${project.name}/${svc.name}`,
          url: info?.domain ? `https://${info.domain}` : null,
          type: 'service',
          region: info?.region || null,
          createdAt: (svc.createdAt as string) || new Date().toISOString()
        })
      }
    }

    return services
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    limit = 20
  ): Promise<ProdDeployment[]> {
    const data = await this.gql(
      creds,
      `query($serviceId: String!, $limit: Int) {
        deployments(
          input: { serviceId: $serviceId }
          first: $limit
        ) {
          edges {
            node {
              id
              status
              createdAt
              meta
            }
          }
        }
      }`,
      { serviceId, limit }
    )

    const deploys = data.deployments as Record<string, unknown>
    const edges = (deploys?.edges as Array<Record<string, unknown>>) || []

    return edges.map((edge) => {
      const d = edge.node as Record<string, unknown>
      const meta = (d.meta as Record<string, unknown>) || {}
      return {
        id: d.id as string,
        serviceId,
        provider: 'railway' as const,
        status: mapDeployStatus((d.status as string) || 'unknown'),
        commitHash: (meta.commitHash as string) || null,
        commitMessage: (meta.commitMessage as string) || null,
        branch: (meta.branch as string) || null,
        createdAt: (d.createdAt as string) || new Date().toISOString(),
        finishedAt: null,
        duration: null
      }
    })
  }

  async fetchDeployLogs(
    creds: PlatformCredentials,
    _serviceId: string,
    deployId: string
  ): Promise<string> {
    try {
      const data = await this.gql(
        creds,
        `query($deploymentId: String!) {
          deploymentLogs(deploymentId: $deploymentId) {
            message
            timestamp
          }
        }`,
        { deploymentId: deployId }
      )

      const logs = (data.deploymentLogs as Array<Record<string, unknown>>) || []
      return logs.map((l) => `${l.timestamp || ''} ${l.message || ''}`).join('\n')
    } catch {
      return 'Deploy logs not available for this deployment'
    }
  }

  async fetchPerformanceMetrics(
    _creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    // Railway has limited metrics API; return empty for now
    return [
      {
        serviceId,
        provider: 'railway',
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
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    try {
      const data = await this.gql(
        creds,
        `query($serviceId: String!) {
          usage(serviceId: $serviceId) {
            currentUsage {
              cpuUsage
              memoryUsageMB
              memoryLimitMB
            }
          }
        }`,
        { serviceId }
      )

      const usage = data.usage as Record<string, unknown>
      const current = (usage?.currentUsage as Record<string, unknown>) || {}

      return [
        {
          serviceId,
          provider: 'railway',
          timestamp: new Date().toISOString(),
          cpuPercent: (current.cpuUsage as number) || null,
          memoryPercent:
            current.memoryUsageMB && current.memoryLimitMB
              ? Math.round(
                  ((current.memoryUsageMB as number) / (current.memoryLimitMB as number)) * 100
                )
              : null,
          memoryUsedBytes: current.memoryUsageMB
            ? (current.memoryUsageMB as number) * 1024 * 1024
            : null,
          memoryLimitBytes: current.memoryLimitMB
            ? (current.memoryLimitMB as number) * 1024 * 1024
            : null,
          diskUsedBytes: null,
          diskLimitBytes: null
        }
      ]
    } catch {
      return []
    }
  }

  async triggerRollback(
    creds: PlatformCredentials,
    _serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.gql(
        creds,
        `mutation($id: String!) {
          deploymentRedeploy(id: $id) {
            id
          }
        }`,
        { id: deployId }
      )
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}
