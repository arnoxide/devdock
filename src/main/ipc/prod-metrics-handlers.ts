import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { PlatformCredentials, PlatformProvider } from '../../shared/types'
import { productionMetrics } from '../services/production-metrics'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerProdMetricsHandlers(): void {
  // Forward service events to renderer
  const events = [
    ['services-update', IPC.PROD_SERVICES_UPDATE],
    ['deployments-update', IPC.PROD_DEPLOYMENTS_UPDATE],
    ['performance-update', IPC.PROD_PERFORMANCE_UPDATE],
    ['resources-update', IPC.PROD_RESOURCES_UPDATE],
    ['provider-status-update', IPC.PROD_PROVIDER_STATUS_UPDATE]
  ] as const

  for (const [event, channel] of events) {
    productionMetrics.on(event, (data) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    })
  }

  // Credential management
  ipcMain.handle(IPC.PROD_SET_CREDENTIALS, async (_event, creds: PlatformCredentials) => {
    productionMetrics.setCredentials(creds)
  })

  ipcMain.handle(IPC.PROD_REMOVE_CREDENTIALS, async (_event, provider: PlatformProvider) => {
    productionMetrics.removeCredentials(provider)
  })

  ipcMain.handle(IPC.PROD_GET_CREDENTIALS, async () => {
    return productionMetrics.getCredentials()
  })

  ipcMain.handle(IPC.PROD_TEST_CONNECTION, async (_event, provider: PlatformProvider) => {
    return productionMetrics.testConnection(provider)
  })

  // Data fetching
  ipcMain.handle(IPC.PROD_GET_SERVICES, async () => {
    return productionMetrics.getServices()
  })

  ipcMain.handle(IPC.PROD_GET_DEPLOYMENTS, async (_event, serviceId: string) => {
    return productionMetrics.getDeployments(serviceId)
  })

  ipcMain.handle(
    IPC.PROD_GET_DEPLOY_LOGS,
    async (_event, provider: PlatformProvider, serviceId: string, deployId: string) => {
      return productionMetrics.fetchDeployLogs(provider, serviceId, deployId)
    }
  )

  ipcMain.handle(IPC.PROD_GET_PERFORMANCE, async (_event, serviceId: string) => {
    return productionMetrics.getPerformance(serviceId)
  })

  ipcMain.handle(IPC.PROD_GET_RESOURCES, async (_event, serviceId: string) => {
    return productionMetrics.getResources(serviceId)
  })

  // Monitoring control
  ipcMain.handle(IPC.PROD_START_MONITORING, async () => {
    productionMetrics.start()
  })

  ipcMain.handle(IPC.PROD_STOP_MONITORING, async () => {
    productionMetrics.stop()
  })

  ipcMain.handle(
    IPC.PROD_TRIGGER_ROLLBACK,
    async (_event, provider: PlatformProvider, serviceId: string, deployId: string) => {
      return productionMetrics.triggerRollback(provider, serviceId, deployId)
    }
  )

  ipcMain.handle(IPC.PROD_REFRESH_NOW, async () => {
    const creds = productionMetrics.getCredentials().filter((c) => c.enabled)
    await Promise.allSettled(creds.map((c) => productionMetrics.fetchAllForProvider(c)))
  })
}
