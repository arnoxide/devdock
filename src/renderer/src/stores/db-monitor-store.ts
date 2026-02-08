import { create } from 'zustand'
import {
  DbConnectionConfig,
  DbConnectionState,
  DbQueryResult
} from '../../../shared/types'

interface DbMonitorStore {
  connections: DbConnectionConfig[]
  statuses: Record<string, DbConnectionState>
  queryResults: Record<string, DbQueryResult>

  addConnection: (config: DbConnectionConfig) => Promise<DbConnectionState>
  removeConnection: (id: string) => Promise<void>
  testConnection: (config: DbConnectionConfig) => Promise<DbConnectionState>
  runQuery: (connectionId: string, query: string) => Promise<DbQueryResult>
  updateStatus: (state: DbConnectionState) => void
  setConnections: (connections: DbConnectionConfig[]) => void
}

export const useDbMonitorStore = create<DbMonitorStore>((set) => ({
  connections: [],
  statuses: {},
  queryResults: {},

  addConnection: async (config: DbConnectionConfig) => {
    const state = await window.api.addDbConnection(config)
    set((s) => ({
      connections: [...s.connections, config],
      statuses: { ...s.statuses, [config.id]: state }
    }))
    return state
  },

  removeConnection: async (id: string) => {
    await window.api.removeDbConnection(id)
    set((s) => ({
      connections: s.connections.filter((c) => c.id !== id)
    }))
  },

  testConnection: async (config: DbConnectionConfig) => {
    const state = await window.api.testDbConnection(config)
    set((s) => ({
      statuses: { ...s.statuses, [config.id]: state }
    }))
    return state
  },

  runQuery: async (connectionId: string, query: string) => {
    const result = await window.api.runDbQuery({ connectionId, query })
    set((s) => ({
      queryResults: { ...s.queryResults, [connectionId]: result }
    }))
    return result
  },

  updateStatus: (state: DbConnectionState) => {
    set((s) => ({
      statuses: { ...s.statuses, [state.configId]: state }
    }))
  },

  setConnections: (connections: DbConnectionConfig[]) => {
    set({ connections })
  }
}))
