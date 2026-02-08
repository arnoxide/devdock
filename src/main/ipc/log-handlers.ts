import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { LogFilter } from '../../shared/types'
import { logCollector } from '../services/log-collector'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerLogHandlers(): void {
  logCollector.on('new-entry', (entry) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.LOG_NEW_ENTRY, entry)
    }
  })

  ipcMain.handle(IPC.LOG_GET, async (_event, projectId: string, filter?: LogFilter) => {
    if (projectId === 'all') {
      return logCollector.getAllEntries(filter)
    }
    return logCollector.getEntries(projectId, filter)
  })

  ipcMain.handle(IPC.LOG_CLEAR, async (_event, projectId: string) => {
    logCollector.clear(projectId)
  })
}
