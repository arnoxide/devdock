import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { isProtectedSystemPath, systemMonitor } from '../services/system-monitor'
import store from '../store'
import { SystemScanRequest } from '../../shared/types'

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

  ipcMain.handle(IPC.SYSTEM_SCAN_FILES, async (_event, request: SystemScanRequest) => {
    return systemMonitor.scanFileSystem(request)
  })

  ipcMain.handle(IPC.SYSTEM_DELETE_FILES, async (_event, filePaths: string[]) => {
    const deleted: string[] = []
    const failed: Array<{ path: string; error: string }> = []

    for (const filePath of filePaths) {
      try {
        if (isProtectedSystemPath(filePath)) {
          throw new Error('Protected OS files cannot be moved to trash from DevDock')
        }

        await shell.trashItem(filePath)
        deleted.push(filePath)
      } catch (error) {
        failed.push({
          path: filePath,
          error: error instanceof Error ? error.message : 'Unable to move file to trash'
        })
      }
    }

    return { deleted, failed }
  })

  ipcMain.handle(IPC.SYSTEM_BROWSE_SCAN_PATH, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Choose a folder to scan'
    })

    return result.canceled ? null : result.filePaths[0]
  })
}
