import { ProdDeployment, ProdService } from '../../../shared/types'
import { asDate, asString, mapCommonDeployStatus, SimpleTokenProvider } from './simple-token-provider'

export class HerokuProvider extends SimpleTokenProvider {
  constructor() {
    super({
      provider: 'heroku',
      baseUrl: 'https://api.heroku.com',
      authHeader: (token) => ({
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.heroku+json; version=3'
      }),
      testPath: '/account',
      servicesPath: '/apps',
      deploymentsPath: (serviceId, limit) => `/apps/${serviceId}/releases?range=version%20..;max=${limit};order=desc`,
      parseServices: (data): ProdService[] => {
        const apps = Array.isArray(data) ? data : []
        return apps.map((app: Record<string, unknown>) => ({
          id: String(app.id || app.name),
          provider: 'heroku',
          name: asString(app.name) || String(app.id),
          url: asString(app.web_url),
          type: 'app',
          region: asString((app.region as Record<string, unknown>)?.name),
          createdAt: asDate(app.created_at)
        }))
      },
      parseDeployments: (data, serviceId): ProdDeployment[] => {
        const releases = Array.isArray(data) ? data : []
        return releases.map((release: Record<string, unknown>) => ({
          id: String(release.id || release.version),
          serviceId,
          provider: 'heroku',
          status: mapCommonDeployStatus(release.status),
          commitHash: asString(release.commit),
          commitMessage: asString(release.description),
          branch: null,
          createdAt: asDate(release.created_at),
          finishedAt: asString(release.updated_at),
          duration: null
        }))
      }
    })
  }
}
