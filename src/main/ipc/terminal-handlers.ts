import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { ProjectConfig } from '../../shared/types'
import { terminalManager } from '../services/terminal-manager'
import store from '../store'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerTerminalHandlers(): void {
  // Wire terminal events to renderer
  terminalManager.onData((sessionId, data) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.TERMINAL_DATA, { sessionId, data })
    }
  })

  terminalManager.onExit((sessionId, exitCode) => {
    const window = getMainWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send(IPC.TERMINAL_EXIT, { sessionId, exitCode })
    }
  })

  ipcMain.handle(IPC.TERMINAL_CREATE, async (_event, projectId: string) => {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find((p) => p.id === projectId)
    if (!project) throw new Error('Project not found')

    const settings = store.get('globalSettings')
    return terminalManager.create(projectId, project.path, settings.defaultShell)
  })

  ipcMain.handle(IPC.TERMINAL_WRITE, async (_event, sessionId: string, data: string) => {
    terminalManager.write(sessionId, data)
  })

  ipcMain.handle(
    IPC.TERMINAL_RESIZE,
    async (_event, sessionId: string, cols: number, rows: number) => {
      terminalManager.resize(sessionId, cols, rows)
    }
  )

  ipcMain.handle(IPC.TERMINAL_CLOSE, async (_event, sessionId: string) => {
    terminalManager.close(sessionId)
  })

  ipcMain.handle(IPC.TERMINAL_GET_SCROLLBACK, async (_event, sessionId: string) => {
    return terminalManager.getScrollback(sessionId)
  })

  ipcMain.handle(IPC.TERMINAL_GET_BY_PROJECT, async (_event, projectId: string) => {
    return terminalManager.getSessionByProject(projectId)
  })
}
