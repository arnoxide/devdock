import fs from 'fs'
import path from 'path'
import { ProjectConfig } from '../shared/types'
import { processManager } from '../main/services/process-manager'
import { portScanner } from '../main/services/port-scanner'

export interface RemoteRuntime {
  projectId: string
  status: string
  pid: number | null
  port: number | null
  startedAt: string | null
  cpu: number
  memory: number
  uptime: number
  external?: boolean
  processName?: string
}

function isInside(parent: string, child: string): boolean {
  const parentPath = path.resolve(parent)
  const childPath = path.resolve(child)
  return childPath === parentPath || childPath.startsWith(`${parentPath}${path.sep}`)
}

function getProcessCwd(pid: number): string | null {
  if (!pid || process.platform !== 'linux') return null
  try {
    return fs.realpathSync(`/proc/${pid}/cwd`)
  } catch {
    return null
  }
}

export async function getDetectedRuntime(project: ProjectConfig): Promise<RemoteRuntime> {
  const managed = processManager.getRuntime(project.id) as RemoteRuntime
  if (managed.status !== 'idle') return managed

  const ports = await portScanner.scan()
  const matches = ports
    .map((port) => ({ port, cwd: getProcessCwd(port.pid) }))
    .filter((entry) => entry.cwd && isInside(project.path, entry.cwd))
    .sort((a, b) => {
      const aExact = path.resolve(a.cwd!) === path.resolve(project.path) ? 0 : 1
      const bExact = path.resolve(b.cwd!) === path.resolve(project.path) ? 0 : 1
      return aExact - bExact
    })

  const match = matches[0]
  if (!match) return managed

  return {
    projectId: project.id,
    status: 'running',
    pid: match.port.pid || null,
    port: match.port.port,
    startedAt: null,
    cpu: 0,
    memory: 0,
    uptime: 0,
    external: true,
    processName: match.port.processName
  }
}

export async function getDetectedRuntimes(projects: ProjectConfig[]): Promise<Record<string, RemoteRuntime>> {
  const entries = await Promise.all(
    projects
      .filter((project) => !project.isGroup)
      .map(async (project) => [project.id, await getDetectedRuntime(project)] as const)
  )
  return Object.fromEntries(entries)
}
