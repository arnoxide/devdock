import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { ProjectConfig } from '../../shared/types'
import { processManager } from '../services/process-manager'
import { logCollector } from '../services/log-collector'
import { systemMonitor } from '../services/system-monitor'
import store from '../store'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerProcessHandlers(): void {
  // Wire process manager events to renderer
  processManager.on('output', (data) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.PROCESS_OUTPUT, data)
    }

    // Also collect as log
    logCollector.addEntry(
      data.projectId,
      data.data,
      data.source === 'stdout' ? 'stdout' : data.source === 'stderr' ? 'stderr' : 'system'
    )
  })

  processManager.on('status-changed', (runtime) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.PROCESS_STATUS_CHANGED, runtime)
    }

    // Track/untrack process for system monitoring
    if (runtime.status === 'running' && runtime.pid) {
      systemMonitor.trackProcess(runtime.pid, runtime.projectId)
    } else if (runtime.status === 'idle' || runtime.status === 'error') {
      if (runtime.pid) systemMonitor.untrackProcess(runtime.pid)
    }
  })

  ipcMain.handle(IPC.PROCESS_START, async (_event, projectId: string, command?: string) => {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find((p) => p.id === projectId)
    if (!project) throw new Error('Project not found')

    const cmd = command || project.startCommand
    if (!cmd) throw new Error('No start command configured for this project')

    await processManager.start(projectId, cmd, project.path)
  })

  ipcMain.handle(IPC.PROCESS_STOP, async (_event, projectId: string) => {
    await processManager.stop(projectId)
  })

  ipcMain.handle(IPC.PROCESS_RESTART, async (_event, projectId: string) => {
    await processManager.restart(projectId)
  })

  ipcMain.handle(IPC.PROCESS_STATUS, async (_event, projectId: string) => {
    return processManager.getRuntime(projectId)
  })

  ipcMain.handle(IPC.PROCESS_STATUS_ALL, async () => {
    return processManager.getAllRuntimes()
  })

  ipcMain.handle(
    IPC.PROCESS_RUN_COMMAND,
    async (_event, projectId: string, command: string) => {
      const projects = store.get('projects', []) as ProjectConfig[]
      const project = projects.find((p) => p.id === projectId)
      if (!project) throw new Error('Project not found')

      // Run as a one-off command (uses a temporary process ID)
      const tempId = `${projectId}-cmd-${Date.now()}`
      await processManager.start(tempId, command, project.path)
    }
  )
}
