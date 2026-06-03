import { create } from 'zustand'
import {
  SystemMetrics,
  ProcessMetrics,
  SystemDeleteResult,
  SystemScanRequest,
  SystemScanResult
} from '../../../shared/types'

interface SystemStore {
  metrics: SystemMetrics | null
  processMetrics: ProcessMetrics[]
  metricsHistory: SystemMetrics[]
  scanResult: SystemScanResult | null
  isScanning: boolean
  scanError: string | null

  updateMetrics: (metrics: SystemMetrics) => void
  updateProcessMetrics: (metrics: ProcessMetrics[]) => void
  startMonitoring: () => Promise<void>
  stopMonitoring: () => Promise<void>
  scanFiles: (request: SystemScanRequest) => Promise<void>
  deleteFiles: (filePaths: string[]) => Promise<SystemDeleteResult>
  browseScanPath: () => Promise<string | null>
}

const MAX_HISTORY = 100

export const useSystemStore = create<SystemStore>((set) => ({
  metrics: null,
  processMetrics: [],
  metricsHistory: [],
  scanResult: null,
  isScanning: false,
  scanError: null,

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
  },

  scanFiles: async (request) => {
    set({ isScanning: true, scanError: null })
    try {
      const scanResult = await window.api.scanSystemFiles(request)
      set({ scanResult, isScanning: false })
    } catch (error) {
      set({
        isScanning: false,
        scanError: error instanceof Error ? error.message : 'Unable to scan files'
      })
    }
  },

  deleteFiles: async (filePaths) => {
    const result = await window.api.deleteSystemFiles(filePaths)
    set((state) => {
      if (!state.scanResult) return state
      const deleted = new Set(result.deleted)
      return {
        scanResult: {
          ...state.scanResult,
          largestFiles: state.scanResult.largestFiles.filter((file) => !deleted.has(file.path))
        }
      }
    })
    return result
  },

  browseScanPath: async () => {
    return window.api.browseSystemScanPath()
  }
}))
