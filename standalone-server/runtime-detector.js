const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const processManager = require('./process-manager')

const execAsync = promisify(exec)

function isInside(parent, child) {
  const parentPath = path.resolve(parent)
  const childPath = path.resolve(child)
  return childPath === parentPath || childPath.startsWith(`${parentPath}${path.sep}`)
}

function getProcessCwd(pid) {
  if (!pid || process.platform !== 'linux') return null
  try {
    return fs.realpathSync(`/proc/${pid}/cwd`)
  } catch {
    return null
  }
}

async function scanPorts() {
  if (process.platform !== 'linux') return []
  try {
    const { stdout } = await execAsync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null')
    return stdout.split('\n').slice(1).flatMap((line) => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) return []
      const localAddr = parts[3] || ''
      const portMatch = localAddr.match(/:(\d+)$/)
      const processInfo = parts.slice(5).join(' ')
      const pidMatch = processInfo.match(/pid=(\d+)/)
      const nameMatch = processInfo.match(/\("([^"]+)"/)
      if (!portMatch || !pidMatch) return []
      return [{
        port: parseInt(portMatch[1], 10),
        pid: parseInt(pidMatch[1], 10),
        processName: nameMatch ? nameMatch[1] : 'unknown'
      }]
    })
  } catch {
    return []
  }
}

async function getDetectedRuntime(project) {
  const managed = processManager.getStatus(project.id)
  if (managed && managed.status !== 'idle') {
    return {
      projectId: project.id,
      status: managed.status,
      pid: null,
      port: managed.port ?? null,
      startedAt: null,
      cpu: 0,
      memory: 0,
      uptime: 0
    }
  }

  const ports = await scanPorts()
  const match = ports
    .map((port) => ({ port, cwd: getProcessCwd(port.pid) }))
    .filter((entry) => entry.cwd && isInside(project.path, entry.cwd))
    .sort((a, b) => {
      const aExact = path.resolve(a.cwd) === path.resolve(project.path) ? 0 : 1
      const bExact = path.resolve(b.cwd) === path.resolve(project.path) ? 0 : 1
      return aExact - bExact
    })[0]

  if (!match) {
    return {
      projectId: project.id,
      status: 'idle',
      pid: null,
      port: null,
      startedAt: null,
      cpu: 0,
      memory: 0,
      uptime: 0
    }
  }

  return {
    projectId: project.id,
    status: 'running',
    pid: match.port.pid,
    port: match.port.port,
    startedAt: null,
    cpu: 0,
    memory: 0,
    uptime: 0,
    external: true,
    processName: match.port.processName
  }
}

async function getDetectedRuntimes(projects) {
  const entries = await Promise.all(
    projects
      .filter((project) => !project.isGroup)
      .map(async (project) => [project.id, await getDetectedRuntime(project)])
  )
  return Object.fromEntries(entries)
}

module.exports = { getDetectedRuntime, getDetectedRuntimes }
