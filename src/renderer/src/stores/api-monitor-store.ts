import { create } from 'zustand'
import { ApiEndpointConfig, ApiEndpointResult, ApiEndpointHistory } from '../../../shared/types'

interface ApiMonitorStore {
  endpoints: ApiEndpointConfig[]
  results: Record<string, ApiEndpointResult>
  histories: Record<string, ApiEndpointHistory>

  addEndpoint: (config: ApiEndpointConfig) => Promise<void>
  removeEndpoint: (id: string) => Promise<void>
  updateEndpoint: (config: ApiEndpointConfig) => Promise<void>
  updateResult: (result: ApiEndpointResult) => void
  loadHistory: (endpointId: string) => Promise<void>
  setEndpoints: (endpoints: ApiEndpointConfig[]) => void
}

export const useApiMonitorStore = create<ApiMonitorStore>((set, get) => ({
  endpoints: [],
  results: {},
  histories: {},

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

  updateResult: (result: ApiEndpointResult) => {
    set((state) => {
      const history = state.histories[result.endpointId] || {
        endpointId: result.endpointId,
        results: []
      }
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
  }
}))
