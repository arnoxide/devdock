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
}
