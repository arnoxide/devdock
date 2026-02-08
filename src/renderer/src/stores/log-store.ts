import { create } from 'zustand'
import { LogEntry, LogFilter } from '../../../shared/types'

interface LogStore {
  entries: LogEntry[]
  filter: LogFilter

  addEntry: (entry: LogEntry) => void
  setEntries: (entries: LogEntry[]) => void
  setFilter: (filter: Partial<LogFilter>) => void
  loadLogs: (projectId: string, filter?: LogFilter) => Promise<void>
  clearLogs: (projectId: string) => Promise<void>
}

const MAX_ENTRIES = 5000

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],
  filter: {},

  addEntry: (entry: LogEntry) => {
    set((state) => {
      const entries = [...state.entries, entry]
      if (entries.length > MAX_ENTRIES) entries.shift()
      return { entries }
    })
  },

  setEntries: (entries: LogEntry[]) => {
    set({ entries })
  },

  setFilter: (filter: Partial<LogFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter }
    }))
  },

  loadLogs: async (projectId: string, filter?: LogFilter) => {
    const entries = await window.api.getLogs(projectId, filter)
    set({ entries })
  },

  clearLogs: async (projectId: string) => {
    await window.api.clearLogs(projectId)
    set({ entries: [] })
  }
}))
