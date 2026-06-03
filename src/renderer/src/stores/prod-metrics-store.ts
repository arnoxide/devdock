import { create } from 'zustand'
import {
  PlatformProvider,
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  ProviderStatus
} from '../../../shared/types'

interface ProdMetricsStore {
  credentials: PlatformCredentials[]
  services: ProdService[]
  deployments: Record<string, ProdDeployment[]>
  performance: Record<string, ProdPerformanceMetrics[]>
  resources: Record<string, ProdResourceMetrics[]>
  providerStatuses: Record<string, ProviderStatus>
  selectedServiceId: string | null
  deployLogs: Record<string, string>
  loading: boolean

  loadCredentials: () => Promise<void>
  setCredentials: (creds: PlatformCredentials) => Promise<void>
  removeCredentials: (provider: PlatformProvider, accountId?: string) => Promise<void>
  testConnection: (provider: PlatformProvider, accountId?: string) => Promise<ProviderStatus>

  loadServices: () => Promise<void>
  loadDeployments: (serviceId: string) => Promise<void>
  loadDeployLogs: (
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ) => Promise<void>
  triggerRollback: (
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ) => Promise<{ ok: boolean; error?: string }>
  refreshNow: () => Promise<void>

  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>

  updateServices: (services: ProdService[]) => void
  updateDeployments: (data: { serviceId: string; deployments: ProdDeployment[] }) => void
  updatePerformance: (data: {
    serviceId: string
    metrics: ProdPerformanceMetrics[]
  }) => void
  updateResources: (data: { serviceId: string; metrics: ProdResourceMetrics[] }) => void
  updateProviderStatus: (status: ProviderStatus) => void

  selectService: (serviceId: string | null) => void
}

export const useProdMetricsStore = create<ProdMetricsStore>((set) => ({
  credentials: [],
  services: [],
  deployments: {},
  performance: {},
  resources: {},
  providerStatuses: {},
  selectedServiceId: null,
  deployLogs: {},
  loading: false,

  loadCredentials: async () => {
    const creds = (await window.api.getProdCredentials()) as PlatformCredentials[]
    set({ credentials: creds || [] })
  },

  setCredentials: async (creds: PlatformCredentials) => {
    await window.api.setProdCredentials(creds)
    set((s) => {
      const credentialId = creds.id || `${creds.provider}:default`
      const normalized = {
        ...creds,
        id: credentialId,
        accountName: creds.accountName || 'Default account'
      }
      const idx = s.credentials.findIndex((c) => (c.id || `${c.provider}:default`) === credentialId)
      const updated = [...s.credentials]
      if (idx >= 0) updated[idx] = normalized
      else updated.push(normalized)
      return { credentials: updated }
    })
  },

  removeCredentials: async (provider: PlatformProvider, accountId?: string) => {
    const credentialId = accountId || `${provider}:default`
    await window.api.removeProdCredentials(provider, accountId)
    set((s) => ({
      credentials: s.credentials.filter((c) => (c.id || `${c.provider}:default`) !== credentialId),
      services: s.services.filter((svc) => svc.accountId !== credentialId)
    }))
  },

  testConnection: async (provider: PlatformProvider, accountId?: string) => {
    const status = (await window.api.testProdConnection(provider, accountId)) as ProviderStatus
    const statusKey = status.accountId || accountId || `${provider}:default`
    set((s) => ({
      providerStatuses: { ...s.providerStatuses, [statusKey]: status }
    }))
    return status
  },

  loadServices: async () => {
    set({ loading: true })
    const services = (await window.api.getProdServices()) as ProdService[]
    set({ services: services || [], loading: false })
  },

  loadDeployments: async (serviceId: string) => {
    const deploys = (await window.api.getProdDeployments(serviceId)) as ProdDeployment[]
    set((s) => ({
      deployments: { ...s.deployments, [serviceId]: deploys || [] }
    }))
  },

  loadDeployLogs: async (
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ) => {
    const logs = (await window.api.getProdDeployLogs(provider, serviceId, deployId)) as string
    set((s) => ({
      deployLogs: { ...s.deployLogs, [deployId]: logs || '' }
    }))
  },

  triggerRollback: async (
    provider: PlatformProvider,
    serviceId: string,
    deployId: string
  ) => {
    return (await window.api.triggerProdRollback(
      provider,
      serviceId,
      deployId
    )) as { ok: boolean; error?: string }
  },

  refreshNow: async () => {
    set({ loading: true })
    await window.api.refreshProdNow()
    set({ loading: false })
  },

  startMonitoring: async () => {
    await window.api.startProdMonitoring()
  },

  stopMonitoring: async () => {
    await window.api.stopProdMonitoring()
  },

  updateServices: (services: ProdService[]) => {
    set({ services })
  },

  updateDeployments: (data) => {
    set((s) => ({
      deployments: { ...s.deployments, [data.serviceId]: data.deployments }
    }))
  },

  updatePerformance: (data) => {
    set((s) => ({
      performance: { ...s.performance, [data.serviceId]: data.metrics }
    }))
  },

  updateResources: (data) => {
    set((s) => ({
      resources: { ...s.resources, [data.serviceId]: data.metrics }
    }))
  },

  updateProviderStatus: (status: ProviderStatus) => {
    const statusKey = status.accountId || `${status.provider}:default`
    set((s) => ({
      providerStatuses: { ...s.providerStatuses, [statusKey]: status }
    }))
  },

  selectService: (serviceId: string | null) => {
    set({ selectedServiceId: serviceId })
  }
}))
