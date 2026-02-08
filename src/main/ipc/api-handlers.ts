import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { ApiEndpointConfig } from '../../shared/types'
import { apiMonitor } from '../services/api-monitor'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerApiHandlers(): void {
  apiMonitor.on('result', (result) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.API_RESULT, result)
    }
  })

  ipcMain.handle(IPC.API_ADD_ENDPOINT, async (_event, config: ApiEndpointConfig) => {
    apiMonitor.startMonitoring(config)
  })

  ipcMain.handle(IPC.API_REMOVE_ENDPOINT, async (_event, endpointId: string) => {
    apiMonitor.stopMonitoring(endpointId)
  })

  ipcMain.handle(IPC.API_UPDATE_ENDPOINT, async (_event, config: ApiEndpointConfig) => {
    apiMonitor.stopMonitoring(config.id)
    apiMonitor.startMonitoring(config)
  })

  ipcMain.handle(IPC.API_CHECK_NOW, async (_event, endpointId: string) => {
    // Need the full config to check - this is a simplified version
    return apiMonitor.getHistory(endpointId)
  })

  ipcMain.handle(IPC.API_GET_HISTORY, async (_event, endpointId: string) => {
    return apiMonitor.getHistory(endpointId)
  })

  ipcMain.handle(IPC.API_START_MONITORING, async (_event, config: ApiEndpointConfig) => {
    apiMonitor.startMonitoring(config)
  })

  ipcMain.handle(IPC.API_STOP_MONITORING, async (_event, endpointId: string) => {
    apiMonitor.stopMonitoring(endpointId)
  })
}
