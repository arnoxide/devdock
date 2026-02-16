import { ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
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

    // Auto-install dependencies if node_modules is missing
    const hasPackageJson = existsSync(join(project.path, 'package.json'))
    const hasNodeModules = existsSync(join(project.path, 'node_modules'))

    if (hasPackageJson && !hasNodeModules) {
      const window = getMainWindow()

      // Determine install command based on project's package manager or lock files
      let installCmd = 'npm install'
      if (project.packageManager === 'yarn' || existsSync(join(project.path, 'yarn.lock'))) {
        installCmd = 'yarn install'
      } else if (project.packageManager === 'pnpm' || existsSync(join(project.path, 'pnpm-lock.yaml'))) {
        installCmd = 'pnpm install'
      } else if (project.packageManager === 'bun' || existsSync(join(project.path, 'bun.lockb'))) {
        installCmd = 'bun install'
      }

      // Notify renderer that we're installing
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC.PROCESS_OUTPUT, {
          projectId,
          data: `\r\n[DevDock] node_modules not found. Running ${installCmd}...\r\n`,
          source: 'system'
        })
      }

      // Run install and wait for completion
      await new Promise<void>((resolve, reject) => {
        const parts = installCmd.split(' ')
        const child = execFile(parts[0], parts.slice(1), {
          cwd: project.path,
          shell: true,
          env: { ...process.env, FORCE_COLOR: '1' },
          maxBuffer: 10 * 1024 * 1024
        }, (error) => {
          if (error) reject(error)
          else resolve()
        })

        child.stdout?.on('data', (data: Buffer | string) => {
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC.PROCESS_OUTPUT, {
              projectId,
              data: data.toString(),
              source: 'stdout'
            })
          }
        })
        child.stderr?.on('data', (data: Buffer | string) => {
          if (window && !window.isDestroyed()) {
            window.webContents.send(IPC.PROCESS_OUTPUT, {
              projectId,
              data: data.toString(),
              source: 'stderr'
            })
          }
        })
      })

      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC.PROCESS_OUTPUT, {
          projectId,
          data: `\r\n[DevDock] Dependencies installed. Starting project...\r\n`,
          source: 'system'
        })
      }
    }

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
