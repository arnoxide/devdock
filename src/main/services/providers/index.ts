import { PlatformProvider } from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'
import { RenderProvider } from './render-provider'
import { RailwayProvider } from './railway-provider'
import { VercelProvider } from './vercel-provider'
import { AwsProvider } from './aws-provider'

const providers: Record<PlatformProvider, PlatformProviderAdapter> = {
  render: new RenderProvider(),
  railway: new RailwayProvider(),
  vercel: new VercelProvider(),
  aws: new AwsProvider()
}

export function getProvider(platform: PlatformProvider): PlatformProviderAdapter {
  return providers[platform]
}
