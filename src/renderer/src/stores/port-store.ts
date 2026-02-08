import { create } from 'zustand'
import { PortInfo } from '../../../shared/types'

interface PortStore {
  ports: PortInfo[]
  loading: boolean

  scanPorts: () => Promise<void>
  killPort: (port: number) => Promise<{ success: boolean; error?: string }>
}

export const usePortStore = create<PortStore>((set) => ({
  ports: [],
  loading: false,

  scanPorts: async () => {
    set({ loading: true })
    try {
      const ports = await window.api.scanPorts()
      set({ ports, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  killPort: async (port: number) => {
    const result = await window.api.killPort(port)
    if (result.success) {
      set((state) => ({
        ports: state.ports.filter((p) => p.port !== port)
      }))
    }
    return result
  }
}))
