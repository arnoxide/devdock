import { PlatformProvider } from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'
import { RenderProvider } from './render-provider'
import { RailwayProvider } from './railway-provider'
import { VercelProvider } from './vercel-provider'
import { AwsProvider } from './aws-provider'
import { NetlifyProvider } from './netlify-provider'
import { CloudflareProvider } from './cloudflare-provider'
import { FlyProvider } from './fly-provider'
import { HerokuProvider } from './heroku-provider'
import { DigitalOceanProvider } from './digitalocean-provider'

const providers: Record<PlatformProvider, PlatformProviderAdapter> = {
  render: new RenderProvider(),
  railway: new RailwayProvider(),
  vercel: new VercelProvider(),
  aws: new AwsProvider(),
  netlify: new NetlifyProvider(),
  cloudflare: new CloudflareProvider(),
  fly: new FlyProvider(),
  heroku: new HerokuProvider(),
  digitalocean: new DigitalOceanProvider()
}

export function getProvider(platform: PlatformProvider): PlatformProviderAdapter {
  return providers[platform]
}
