import { create } from 'zustand'
import { SystemMetrics, ProcessMetrics } from '../../../shared/types'

interface SystemStore {
  metrics: SystemMetrics | null
  processMetrics: ProcessMetrics[]
  metricsHistory: SystemMetrics[]

  updateMetrics: (metrics: SystemMetrics) => void
  updateProcessMetrics: (metrics: ProcessMetrics[]) => void
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
}

const MAX_HISTORY = 100

export const useSystemStore = create<SystemStore>((set) => ({
  metrics: null,
  processMetrics: [],
  metricsHistory: [],

  updateMetrics: (metrics: SystemMetrics) => {
    set((state) => {
      const history = [...state.metricsHistory, metrics].slice(-MAX_HISTORY)
      return { metrics, metricsHistory: history }
    })
  },

  updateProcessMetrics: (metrics: ProcessMetrics[]) => {
    set({ processMetrics: metrics })
  },

  startMonitoring: async () => {
    await window.api.startSystemMonitoring()
  },

  stopMonitoring: async () => {
    await window.api.stopSystemMonitoring()
  }
}))
