import { ProdDeployment, ProdService } from '../../../shared/types'
import { asDate, asString, mapCommonDeployStatus, SimpleTokenProvider } from './simple-token-provider'

export class NetlifyProvider extends SimpleTokenProvider {
  constructor() {
    super({
      provider: 'netlify',
      baseUrl: 'https://api.netlify.com/api/v1',
      authHeader: (token) => ({ Authorization: `Bearer ${token}` }),
      testPath: '/user',
      servicesPath: '/sites',
      deploymentsPath: (serviceId, limit) => `/sites/${serviceId}/deploys?per_page=${limit}`,
      parseServices: (data): ProdService[] => {
        const sites = Array.isArray(data) ? data : []
        return sites.map((site: Record<string, unknown>) => ({
          id: String(site.id),
          provider: 'netlify',
          name: asString(site.name) || asString(site.custom_domain) || String(site.id),
          url: asString(site.ssl_url) || asString(site.url),
          type: 'site',
          region: null,
          createdAt: asDate(site.created_at)
        }))
      },
      parseDeployments: (data, serviceId): ProdDeployment[] => {
        const deploys = Array.isArray(data) ? data : []
        return deploys.map((deploy: Record<string, unknown>) => ({
          id: String(deploy.id),
          serviceId,
          provider: 'netlify',
          status: mapCommonDeployStatus(deploy.state),
          commitHash: asString(deploy.commit_ref),
          commitMessage: asString(deploy.title),
          branch: asString(deploy.branch),
          createdAt: asDate(deploy.created_at),
          finishedAt: asString(deploy.published_at),
          duration: null
        }))
      }
    })
  }
}
