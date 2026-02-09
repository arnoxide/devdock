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
  removeCredentials: (provider: PlatformProvider) => Promise<void>
  testConnection: (provider: PlatformProvider) => Promise<ProviderStatus>

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
      const idx = s.credentials.findIndex((c) => c.provider === creds.provider)
      const updated = [...s.credentials]
      if (idx >= 0) updated[idx] = creds
      else updated.push(creds)
      return { credentials: updated }
    })
  },

  removeCredentials: async (provider: PlatformProvider) => {
    await window.api.removeProdCredentials(provider)
    set((s) => ({
      credentials: s.credentials.filter((c) => c.provider !== provider),
      services: s.services.filter((svc) => svc.provider !== provider)
    }))
  },

  testConnection: async (provider: PlatformProvider) => {
    const status = (await window.api.testProdConnection(provider)) as ProviderStatus
    set((s) => ({
      providerStatuses: { ...s.providerStatuses, [provider]: status }
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
    set((s) => ({
      providerStatuses: { ...s.providerStatuses, [status.provider]: status }
    }))
  },

  selectService: (serviceId: string | null) => {
    set({ selectedServiceId: serviceId })
  }
}))
