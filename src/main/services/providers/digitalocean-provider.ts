import { ProdDeployment, ProdService } from '../../../shared/types'
import { asDate, asString, mapCommonDeployStatus, SimpleTokenProvider } from './simple-token-provider'

export class DigitalOceanProvider extends SimpleTokenProvider {
  constructor() {
    super({
      provider: 'digitalocean',
      baseUrl: 'https://api.digitalocean.com/v2',
      authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
      testPath: '/account',
      servicesPath: '/apps',
      deploymentsPath: (serviceId, limit) => `/apps/${serviceId}/deployments?per_page=${limit}`,
      parseServices: (data): ProdService[] => {
        const apps = ((data as Record<string, unknown>)?.apps as Array<Record<string, unknown>>) || []
        return apps.map((app) => {
          const defaultIngress = app.default_ingress as string | undefined
          const spec = (app.spec as Record<string, unknown>) || {}
          return {
            id: String(app.id),
            provider: 'digitalocean',
            name: asString(app.name) || asString(spec.name) || String(app.id),
            url: defaultIngress ? `https://${defaultIngress}` : null,
            type: 'app',
            region: asString(app.region?.slug) || asString(app.region),
            createdAt: asDate(app.created_at)
          }
        })
      },
      parseDeployments: (data, serviceId): ProdDeployment[] => {
        const deployments = ((data as Record<string, unknown>)?.deployments as Array<Record<string, unknown>>) || []
        return deployments.map((deployment) => ({
          id: String(deployment.id),
          serviceId,
          provider: 'digitalocean',
          status: mapCommonDeployStatus(deployment.phase),
          commitHash: asString((deployment.cause as Record<string, unknown>)?.commit_sha),
          commitMessage: asString((deployment.cause as Record<string, unknown>)?.commit_message),
          branch: null,
          createdAt: asDate(deployment.created_at),
          finishedAt: asString(deployment.updated_at),
          duration: null
        }))
      }
    })
  }
}
