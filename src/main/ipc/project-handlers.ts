import { ipcMain, dialog, BrowserWindow } from 'electron'
import { v4 as uuid } from 'uuid'
import path from 'node:path'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { IPC } from '../../shared/ipc-channels'
import { CloneProjectRequest, ProjectConfig } from '../../shared/types'
import { githubService } from '../services/github-service'
import { projectDetector } from '../services/project-detector'
import store from '../store'

const CLONE_TIMEOUT_MS = 10 * 60 * 1000
const CLONE_IDLE_TIMEOUT_MS = 60 * 1000

function inferCloneDirectoryName(repoUrl: string): string {
  const withoutQuery = repoUrl.trim().split('?')[0].replace(/\/$/, '')
  const lastSegment = withoutQuery.split(/[/:]/).filter(Boolean).pop() || 'repository'
  return lastSegment.replace(/\.git$/, '').replace(/[^a-zA-Z0-9._-]/g, '-')
}

function isSupportedGitUrl(repoUrl: string): boolean {
  return /^(https:\/\/|ssh:\/\/|git@)/.test(repoUrl.trim()) && !/[\r\n]/.test(repoUrl)
}

function isGitHubHttpsUrl(repoUrl: string): boolean {
  return /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/i.test(repoUrl.trim())
}

function normalizeGitHubCloneUrl(repoUrl: string): string {
  return repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '') + '.git'
}

function runGitClone(
  repoUrl: string,
  targetPath: string,
  parentPath: string,
  token?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const normalizedUrl = token ? normalizeGitHubCloneUrl(repoUrl) : repoUrl
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GCM_INTERACTIVE: 'never',
      GIT_ASKPASS: 'echo',
      SSH_ASKPASS: 'echo',
      ...(token
        ? {
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
            GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
          }
        : {})
    }

    const child = spawn('git', ['clone', '--progress', normalizedUrl, targetPath], {
      cwd: parentPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      env
    })

    let output = ''
    let settled = false
    let idleTimer: NodeJS.Timeout | null = null
    const timeout = setTimeout(() => {
      finish(new Error('Clone timed out after 10 minutes. Check your network connection or try cloning from a terminal.'))
      child.kill('SIGTERM')
    }, CLONE_TIMEOUT_MS)

    const resetIdleTimer = (): void => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        finish(new Error('Clone stopped making progress. Git may be waiting for credentials; check that the active GitHub account has access to this repo.'))
        child.kill('SIGTERM')
      }, CLONE_IDLE_TIMEOUT_MS)
    }

    const finish = (err?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (idleTimer) clearTimeout(idleTimer)
      if (err) reject(err)
      else resolve()
    }

    resetIdleTimer()
    child.stdout.on('data', (chunk) => {
      output += chunk.toString()
      resetIdleTimer()
    })
    child.stderr.on('data', (chunk) => {
      output += chunk.toString()
      resetIdleTimer()
    })
    child.on('error', (err) => {
      finish(new Error(`Could not start git clone: ${err.message}`))
    })
    child.on('close', (code) => {
      if (code === 0) {
        finish()
        return
      }
      const redactedOutput = token ? output.replaceAll(token, '[redacted]') : output
      finish(new Error(redactedOutput.trim() || `git clone exited with code ${code}`))
    })
  })
}

async function addSingleProject(projectPath: string): Promise<ProjectConfig> {
  const projects = store.get('projects', [])
  if (projects.some((p: ProjectConfig) => p.path === projectPath)) {
    throw new Error('Project already exists')
  }

  const detection = await projectDetector.detect(projectPath)
  if (detection.type === 'unknown' && !detection.startCommand) {
    throw new Error('The repository cloned, but DevDock could not detect a runnable project in the repo root.')
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
    lastOpenedAt: new Date().toISOString(),
    openCount: 0
  }

  projects.push(project)
  store.set('projects', projects)
  return project
}

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

  ipcMain.handle(IPC.PROJECT_CLONE, async (_event, request: CloneProjectRequest) => {
    const repoUrl = request.repoUrl.trim()
    if (!isSupportedGitUrl(repoUrl)) {
      throw new Error('Use an HTTPS, SSH, or git@ Git URL.')
    }

    const parentPath = path.resolve(request.parentPath)
    const directoryName = (request.directoryName?.trim() || inferCloneDirectoryName(repoUrl))
      .replace(/[/\\]/g, '-')
      .replace(/^\.+$/, '')

    if (!directoryName) throw new Error('Enter a folder name for the clone.')

    const targetPath = path.join(parentPath, directoryName)
    const parentStat = await fs.stat(parentPath).catch(() => null)
    if (!parentStat?.isDirectory()) throw new Error('Choose a valid destination folder.')

    try {
      await fs.access(targetPath)
      throw new Error(`A folder named "${directoryName}" already exists in that location.`)
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err
    }

    const githubToken = isGitHubHttpsUrl(repoUrl) ? githubService.getCredentials()?.token : undefined
    try {
      await runGitClone(repoUrl, targetPath, parentPath, githubToken)
    } catch (err) {
      await fs.rm(targetPath, { recursive: true, force: true }).catch(() => undefined)
      throw err
    }
    return addSingleProject(targetPath)
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
