import { create } from 'zustand'
import { ApiEndpointConfig, ApiEndpointResult, ApiEndpointHistory } from '../../../shared/types'

export interface LogMetricEvent {
  id: string
  projectId: string
  patternId: string
  timestamp: string
  data?: string
}

export interface ApiMonitorStore {
  endpoints: ApiEndpointConfig[]
  results: Record<string, ApiEndpointResult> // endpointId -> latest result
  histories: Record<string, ApiEndpointHistory> // endpointId -> history
  logEvents: LogMetricEvent[]

  addEndpoint: (config: ApiEndpointConfig) => Promise<void>
  removeEndpoint: (id: string) => Promise<void>
  updateEndpoint: (config: ApiEndpointConfig) => Promise<void>
  refreshEndpoint: (id: string) => Promise<void>
  updateResult: (result: ApiEndpointResult) => void
  loadHistory: (endpointId: string) => Promise<void>
  setEndpoints: (endpoints: ApiEndpointConfig[]) => void
  addDetectedEndpoints: (endpoints: ApiEndpointConfig[]) => Promise<void>
  addLogEvent: (event: LogMetricEvent) => void
  loadEndpoints: () => Promise<void>
}

export const useApiMonitorStore = create<ApiMonitorStore>((set, get) => ({
  endpoints: [],
  results: {},
  histories: {},
  logEvents: [],

  loadEndpoints: async () => {
    const endpoints = await window.api.getApiEndpoints()
    set({ endpoints })
  },

  addEndpoint: async (config: ApiEndpointConfig) => {
    await window.api.addApiEndpoint(config)
    set((state) => ({
      endpoints: [...state.endpoints, config]
    }))
  },

  removeEndpoint: async (id: string) => {
    await window.api.removeApiEndpoint(id)
    set((state) => ({
      endpoints: state.endpoints.filter((e) => e.id !== id)
    }))
  },

  updateEndpoint: async (config: ApiEndpointConfig) => {
    await window.api.updateApiEndpoint(config)
    set((state) => ({
      endpoints: state.endpoints.map((e) => (e.id === config.id ? config : e))
    }))
  },

  refreshEndpoint: async (id: string) => {
    await window.api.checkApiNow(id)
    // Results will come back via updateResult
  },

  updateResult: (result: ApiEndpointResult) => {
    set((state) => {
      const history = state.histories[result.endpointId] || {
        endpointId: result.endpointId, // Fix missing property if interface requires it
        results: []
      }
      // Keep last 100 results for charts
      const updatedResults = [...history.results, result].slice(-100)

      return {
        results: { ...state.results, [result.endpointId]: result },
        histories: {
          ...state.histories,
          [result.endpointId]: { ...history, results: updatedResults }
        }
      }
    })
  },

  loadHistory: async (endpointId: string) => {
    const history = await window.api.getApiHistory(endpointId)
    set((state) => ({
      histories: { ...state.histories, [endpointId]: history }
    }))
  },

  setEndpoints: (endpoints: ApiEndpointConfig[]) => {
    set({ endpoints })
  },

  addDetectedEndpoints: async (newEndpoints: ApiEndpointConfig[]) => {
    const currentEndpoints = get().endpoints
    const toAdd = newEndpoints.filter(
      (newEp) =>
        !currentEndpoints.some(
          (currEp) => currEp.url === newEp.url && currEp.method === newEp.method
        )
    )

    for (const ep of toAdd) {
      await window.api.addApiEndpoint(ep)
    }

    if (toAdd.length > 0) {
      set((state) => ({
        endpoints: [...state.endpoints, ...toAdd]
      }))
    }
  },

  addLogEvent: (event: LogMetricEvent) => {
    set((state) => ({
      logEvents: [event, ...state.logEvents].slice(0, 500) // Keep last 500 events
    }))
  }
}))
