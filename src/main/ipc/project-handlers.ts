import { ipcMain, dialog, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'
import path from 'node:path'
import { IPC } from '../../shared/ipc-channels'
import { ProjectConfig } from '../../shared/types'
import { projectDetector } from '../services/project-detector'
import store from '../store'

export function registerProjectHandlers(): void {
  ipcMain.handle(IPC.PROJECT_BROWSE, async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: 'Select Project Directory'
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC.PROJECT_DETECT_TYPE, async (_event, projectPath: string) => {
    return projectDetector.detect(projectPath)
  })

  ipcMain.handle(IPC.PROJECT_ADD, async (_event, projectPath: string) => {
    const detection = await projectDetector.detect(projectPath)
    const projects = store.get('projects', [])

    // Check for duplicate
    if (projects.some((p: ProjectConfig) => p.path === projectPath)) {
      throw new Error('Project already exists')
    }

    const project: ProjectConfig = {
      id: uuid(),
      name: path.basename(projectPath),
      path: projectPath,
      type: detection.type,
      detectedScripts: detection.scripts,
      startCommand: detection.startCommand,
      packageManager: detection.packageManager,
      customCommands: [],
      envFiles: detection.envFiles,
      apiEndpoints: [],
      dbConnections: [],
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString()
    }

    projects.push(project)
    store.set('projects', projects)

    return project
  })

  ipcMain.handle(IPC.PROJECT_REMOVE, async (_event, id: string) => {
    const projects = store.get('projects', [])
    const filtered = projects.filter((p: ProjectConfig) => p.id !== id)
    store.set('projects', filtered)
  })

  ipcMain.handle(
    IPC.PROJECT_UPDATE,
    async (_event, config: Partial<ProjectConfig> & { id: string }) => {
      const projects = store.get('projects', [])
      const index = projects.findIndex((p: ProjectConfig) => p.id === config.id)
      if (index === -1) throw new Error('Project not found')

      projects[index] = { ...projects[index], ...config }
      store.set('projects', projects)
      return projects[index]
    }
  )

  ipcMain.handle(IPC.PROJECT_LIST, async () => {
    return store.get('projects', [])
  })
}
