import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { ApiEndpointConfig, ProjectConfig } from '../../shared/types'
import { apiMonitor } from '../services/api-monitor'
import { processManager } from '../services/process-manager'
import { apiEndpointDetector } from '../services/api-endpoint-detector'
import { logMetricAnalyzer } from '../services/log-metric-analyzer'
import store from '../store'



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

  ipcMain.handle(IPC.API_GET_ALL_ENDPOINTS, async (_event) => {
    return apiMonitor.getAllEndpoints()
  })

  ipcMain.handle(IPC.API_START_MONITORING, async (_event, config: ApiEndpointConfig) => {
    apiMonitor.startMonitoring(config)
  })

  ipcMain.handle(IPC.API_STOP_MONITORING, async (_event, endpointId: string) => {
    apiMonitor.stopMonitoring(endpointId)
  })

  // Listen for process port detection
  processManager.on('port-detected', async ({ projectId, port }: { projectId: string; port: number }) => {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find((p) => p.id === projectId)

    if (project) {
      const window = getMainWindow()
      if (!window || window.isDestroyed()) return

      // 1. Send common endpoints immediately (fast)
      const commonEndpoints = apiEndpointDetector.generateCommonEndpoints(
        projectId,
        project.name,
        port
      )
      window.webContents.send(IPC.API_ENDPOINTS_DETECTED, commonEndpoints)

      // 2. Scan project files for custom routes (slower)
      try {
        const detected = await apiEndpointDetector.scanProjectRoutes(project.path)
        if (detected.length > 0) {
          const scannedEndpoints = apiEndpointDetector.generateEndpointsFromScan(
            projectId,
            project.name,
            port,
            detected
          )
          window.webContents.send(IPC.API_ENDPOINTS_DETECTED, scannedEndpoints)
        }
      } catch (err) {
        console.error('Error scanning project routes:', err)
      }
    }
  })

  // Listen for log analysis metrics
  logMetricAnalyzer.on('metric-event', (event) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.API_LOG_METRIC_UPDATE, { type: 'event', payload: event })
    }
  })
}
