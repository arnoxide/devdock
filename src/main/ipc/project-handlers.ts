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
    const projects = store.get('projects', [])
    const fs = await import('fs/promises')

    console.log('[PROJECT_ADD] Adding project:', projectPath)

    // Check for duplicate
    if (projects.some((p: ProjectConfig) => p.path === projectPath)) {
      throw new Error('Project already exists')
    }

    try {
      // Check if this folder contains multiple sub-projects
      const entries = await fs.readdir(projectPath, { withFileTypes: true })
      const subDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')

      console.log('[PROJECT_ADD] Found subdirectories:', subDirs.map(d => d.name))

      const nestedProjects: Array<{ name: string; path: string; detection: any }> = []

      // Check each subdirectory for project markers
      for (const dir of subDirs) {
        const subPath = path.join(projectPath, dir.name)
        try {
          // Check if directory has project markers
          const subEntries = await fs.readdir(subPath)
          const hasProjectMarker = subEntries.some(file =>
            file === 'package.json' ||
            file === 'requirements.txt' ||
            file === 'Cargo.toml' ||
            file === 'go.mod' ||
            file === 'Pipfile' ||
            file === 'pyproject.toml'
          )

          if (hasProjectMarker) {
            const detection = await projectDetector.detect(subPath)
            console.log(`[PROJECT_ADD] Detected ${dir.name}:`, detection.type)
            nestedProjects.push({ name: dir.name, path: subPath, detection })
          }
        } catch (err) {
          console.log(`[PROJECT_ADD] Error checking ${dir.name}:`, err)
          // Skip directories that can't be read
        }
      }

      console.log('[PROJECT_ADD] Found nested projects:', nestedProjects.length)

      // If we found 2+ nested projects, create a group structure
      if (nestedProjects.length >= 2) {
        console.log('[PROJECT_ADD] Creating group structure')
        const groupId = uuid()
        const groupProject: ProjectConfig = {
          id: groupId,
          name: path.basename(projectPath),
          path: projectPath,
          type: 'unknown',
          detectedScripts: {},
          startCommand: '',
          packageManager: null,
          customCommands: [],
          envFiles: [],
          apiEndpoints: [],
          dbConnections: [],
          color: '#6366f1',
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
          openCount: 0,
          isGroup: true
        }

        projects.push(groupProject)

        // Add each nested project
        for (const nested of nestedProjects) {
          const childProject: ProjectConfig = {
            id: uuid(),
            name: nested.name,
            path: nested.path,
            type: nested.detection.type,
            detectedScripts: nested.detection.scripts,
            startCommand: nested.detection.startCommand,
            packageManager: nested.detection.packageManager,
            customCommands: [],
            envFiles: nested.detection.envFiles,
            apiEndpoints: [],
            dbConnections: [],
            color: '#3b82f6',
            createdAt: new Date().toISOString(),
            lastOpenedAt: new Date().toISOString(),
            openCount: 0,
            parentId: groupId
          }
          projects.push(childProject)
          console.log('[PROJECT_ADD] Added child project:', nested.name)
        }

        store.set('projects', projects)
        console.log('[PROJECT_ADD] Group created successfully')
        return groupProject
      }

      // If we found exactly 1 nested project, add just that project (not the parent folder)
      if (nestedProjects.length === 1) {
        console.log('[PROJECT_ADD] Found single nested project, adding it directly')
        const nested = nestedProjects[0]
        const project: ProjectConfig = {
          id: uuid(),
          name: nested.name,
          path: nested.path,
          type: nested.detection.type,
          detectedScripts: nested.detection.scripts,
          startCommand: nested.detection.startCommand,
          packageManager: nested.detection.packageManager,
          customCommands: [],
          envFiles: nested.detection.envFiles,
          apiEndpoints: [],
          dbConnections: [],
          color: '#3b82f6',
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
          openCount: 0
        }

        projects.push(project)
        store.set('projects', projects)
        console.log('[PROJECT_ADD] Single nested project added successfully')
        return project
      }

      // Otherwise, try to add the parent folder itself as a project
      console.log('[PROJECT_ADD] No nested projects found, checking parent folder')
      const detection = await projectDetector.detect(projectPath)

      // Only add if it's a valid project (has project markers)
      if (detection.type === 'unknown' && !detection.startCommand) {
        console.log('[PROJECT_ADD] Parent folder is not a valid project')
        throw new Error('This folder does not contain any valid projects. Please select a folder with a package.json, requirements.txt, or other project files.')
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

      console.log('[PROJECT_ADD] Single project added successfully')
      return project
    } catch (error) {
      console.error('[PROJECT_ADD] Error:', error)
      throw error
    }
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

  ipcMain.handle(IPC.PROJECT_OPEN_IN_EDITOR, async (_event, projectPath: string) => {
    const { exec } = await import('child_process')
    return new Promise<void>((resolve, reject) => {
      exec(`code "${projectPath}"`, (err) => {
        if (err) reject(new Error('Could not open VSCode. Make sure the `code` command is installed (Command Palette → "Shell Command: Install \'code\' command in PATH").'))
        else resolve()
      })
    })
  })

  ipcMain.handle(IPC.PROJECT_GROUP_SYNC, async (_event, groupId: string) => {
    const projects = store.get('projects', [])
    const group = projects.find((p: ProjectConfig) => p.id === groupId)
    if (!group || !group.path) throw new Error('Group not found')

    const fs = await import('fs/promises')
    const entries = await fs.readdir(group.path, { withFileTypes: true })
    const subDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')

    const existingPaths = new Set(projects.map((p: ProjectConfig) => p.path))
    const added: ProjectConfig[] = []

    for (const dir of subDirs) {
      const subPath = path.join(group.path, dir.name)
      if (existingPaths.has(subPath)) continue
      try {
        const subEntries = await fs.readdir(subPath)
        const hasProjectMarker = subEntries.some(file =>
          ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'Pipfile', 'pyproject.toml'].includes(file)
        )
        if (!hasProjectMarker) continue
        const detection = await projectDetector.detect(subPath)
        const child: ProjectConfig = {
          id: uuid(),
          name: dir.name,
          path: subPath,
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
          lastOpenedAt: new Date().toISOString(),
          openCount: 0,
          parentId: groupId
        }
        projects.push(child)
        added.push(child)
      } catch {
        // skip unreadable dirs
      }
    }

    store.set('projects', projects)
    return added
  })

  ipcMain.handle(IPC.PROJECT_LIST, async () => {
    return store.get('projects', [])
  })

  ipcMain.handle(IPC.PROJECT_OPEN, async (_event, id: string) => {
    const projects = store.get('projects', [])
    const index = projects.findIndex((p: ProjectConfig) => p.id === id)
    if (index === -1) return
    projects[index] = {
      ...projects[index],
      lastOpenedAt: new Date().toISOString(),
      openCount: (projects[index].openCount || 0) + 1
    }
    store.set('projects', projects)
    return projects[index]
  })
}
