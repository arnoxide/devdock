import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { systemMonitor } from '../services/system-monitor'
import store from '../store'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerSystemHandlers(): void {
  systemMonitor.on('system-metrics', (metrics) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.SYSTEM_METRICS_UPDATE, metrics)
    }
  })

  systemMonitor.on('process-metrics', (metrics) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.PROCESS_METRICS_UPDATE, metrics)
    }
  })

  ipcMain.handle(IPC.SYSTEM_METRICS, async () => {
    return systemMonitor.collectSystemMetrics()
  })

  ipcMain.handle(IPC.SYSTEM_START_MONITORING, async () => {
    const settings = store.get('globalSettings')
    systemMonitor.start(settings.systemMonitorIntervalMs)
  })

  ipcMain.handle(IPC.SYSTEM_STOP_MONITORING, async () => {
    systemMonitor.stop()
  })
}
