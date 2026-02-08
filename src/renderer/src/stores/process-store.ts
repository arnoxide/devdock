import { create } from 'zustand'

interface ProcessStore {
  outputs: Record<string, string[]>

  startServer: (projectId: string) => Promise<void>
  stopServer: (projectId: string) => Promise<void>
  restartServer: (projectId: string) => Promise<void>
  appendOutput: (projectId: string, data: string) => void
  clearOutput: (projectId: string) => void
}

const MAX_OUTPUT_LINES = 2000

export const useProcessStore = create<ProcessStore>((set) => ({
  outputs: {},

  startServer: async (projectId: string) => {
    await window.api.startProcess(projectId)
  },

  stopServer: async (projectId: string) => {
    await window.api.stopProcess(projectId)
  },

  restartServer: async (projectId: string) => {
    await window.api.restartProcess(projectId)
  },

  appendOutput: (projectId: string, data: string) => {
    set((state) => {
      const current = state.outputs[projectId] || []
      const lines = data.split('\n')
      const updated = [...current, ...lines].slice(-MAX_OUTPUT_LINES)
      return { outputs: { ...state.outputs, [projectId]: updated } }
    })
  },

  clearOutput: (projectId: string) => {
    set((state) => ({
      outputs: { ...state.outputs, [projectId]: [] }
    }))
  }
}))
