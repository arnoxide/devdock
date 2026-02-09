import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { DbConnectionConfig, DbQueryRequest } from '../../shared/types'
import { dbMonitor } from '../services/db-monitor'

export function registerDbHandlers(): void {
  ipcMain.handle(IPC.DB_ADD_CONNECTION, async (_event, config: DbConnectionConfig) => {
    return dbMonitor.testConnection(config)
  })

  ipcMain.handle(IPC.DB_REMOVE_CONNECTION, async (_event, connectionId: string) => {
    await dbMonitor.disconnect(connectionId)
  })

  ipcMain.handle(IPC.DB_TEST_CONNECTION, async (_event, config: DbConnectionConfig) => {
    return dbMonitor.testConnection(config)
  })

  ipcMain.handle(IPC.DB_GET_STATUS, async (_event, connectionId: string) => {
    return dbMonitor.getStatus(connectionId)
  })

  ipcMain.handle(IPC.DB_RUN_QUERY, async (_event, req: DbQueryRequest) => {
    return dbMonitor.runQuery(req)
  })

  ipcMain.handle(IPC.DB_LIST_TABLES, async (_event, connectionId: string) => {
    return dbMonitor.listTables(connectionId)
  })

  ipcMain.handle(
    IPC.DB_GET_TABLE_DATA,
    async (_event, connectionId: string, tableName: string, page?: number, pageSize?: number) => {
      return dbMonitor.getTableData(connectionId, tableName, page, pageSize)
    }
  )

  ipcMain.handle(
    IPC.DB_GET_TABLE_COLUMNS,
    async (_event, connectionId: string, tableName: string) => {
      return dbMonitor.getTableColumns(connectionId, tableName)
    }
  )
  ipcMain.handle(IPC.DB_GET_CONNECTIONS, async () => {
    return dbMonitor.getAllConfigs()
  })
}
