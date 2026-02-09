import { create } from 'zustand'
import {
  DbConnectionConfig,
  DbConnectionState,
  DbQueryResult,
  DbTableInfo,
  DbTableData
} from '../../../shared/types'

interface DbMonitorStore {
  connections: DbConnectionConfig[]
  statuses: Record<string, DbConnectionState>
  queryResults: Record<string, DbQueryResult>
  tables: Record<string, DbTableInfo[]>
  tableData: Record<string, DbTableData>
  loadingTables: Record<string, boolean>
  loadingData: Record<string, boolean>

  addConnection: (config: DbConnectionConfig) => Promise<DbConnectionState>
  removeConnection: (id: string) => Promise<void>
  testConnection: (config: DbConnectionConfig) => Promise<DbConnectionState>
  runQuery: (connectionId: string, query: string) => Promise<DbQueryResult>
  updateStatus: (state: DbConnectionState) => void
  setConnections: (connections: DbConnectionConfig[]) => void
  loadTables: (connectionId: string) => Promise<void>
  loadTableData: (connectionId: string, tableName: string, page?: number, pageSize?: number) => Promise<void>
  loadConnections: () => Promise<void>
}

export const useDbMonitorStore = create<DbMonitorStore>((set) => ({
  connections: [],
  statuses: {},
  queryResults: {},
  tables: {},
  tableData: {},
  loadingTables: {},
  loadingData: {},

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
  },

  loadTables: async (connectionId: string) => {
    set((s) => ({ loadingTables: { ...s.loadingTables, [connectionId]: true } }))
    try {
      const tables = await window.api.listDbTables(connectionId)
      set((s) => ({
        tables: { ...s.tables, [connectionId]: tables },
        loadingTables: { ...s.loadingTables, [connectionId]: false }
      }))
    } catch {
      set((s) => ({ loadingTables: { ...s.loadingTables, [connectionId]: false } }))
    }
  },

  loadTableData: async (connectionId: string, tableName: string, page = 1, pageSize = 50) => {
    const key = `${connectionId}:${tableName}`
    set((s) => ({ loadingData: { ...s.loadingData, [key]: true } }))
    try {
      const data = await window.api.getDbTableData(connectionId, tableName, page, pageSize)
      set((s) => ({
        tableData: { ...s.tableData, [key]: data },
        loadingData: { ...s.loadingData, [key]: false }
      }))
    } catch (err) {
      set((s) => ({
        tableData: {
          ...s.tableData,
          [key]: {
            connectionId,
            tableName,
            columns: [],
            rows: [],
            totalRows: 0,
            page,
            pageSize,
            executionTimeMs: 0,
            error: (err as Error).message || 'Failed to load table data'
          }
        },
        loadingData: { ...s.loadingData, [key]: false }
      }))
    }
  },

  loadConnections: async () => {
    const connections = await window.api.getDbConnections()
    set({ connections })
  }
}))
