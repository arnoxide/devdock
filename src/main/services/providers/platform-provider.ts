import {
  PlatformProvider,
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics
} from '../../../shared/types'

export interface PlatformProviderAdapter {
  readonly provider: PlatformProvider

  testConnection(credentials: PlatformCredentials): Promise<{ ok: boolean; error?: string }>

  fetchServices(credentials: PlatformCredentials): Promise<ProdService[]>

  fetchDeployments(
    credentials: PlatformCredentials,
    serviceId: string,
    limit?: number
  ): Promise<ProdDeployment[]>

  fetchDeployLogs(
    credentials: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<string>

  fetchPerformanceMetrics(
    credentials: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]>

  fetchResourceMetrics(
    credentials: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]>

  triggerRollback(
    credentials: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }>
}
