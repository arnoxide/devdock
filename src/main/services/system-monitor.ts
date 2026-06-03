import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { EventEmitter } from 'node:events'
import {
  SystemMetrics,
  ProcessMetrics,
  SystemDiskInfo,
  SystemFileCategory,
  SystemFileEntry,
  SystemFileTypeSummary,
  SystemScanRequest,
  SystemScanResult
} from '../../shared/types'

const execAsync = promisify(exec)

export class SystemMonitor extends EventEmitter {
  private interval: NodeJS.Timeout | null = null
  private previousCpuTimes: { idle: number; total: number } | null = null
  private trackedPids = new Map<number, string>() // pid -> projectId

  trackProcess(pid: number, projectId: string): void {
    this.trackedPids.set(pid, projectId)
  }

  untrackProcess(pid: number): void {
    this.trackedPids.delete(pid)
  }

  start(intervalMs: number = 3000): void {
    this.stop()
    this.interval = setInterval(async () => {
      const metrics = await this.collectSystemMetrics()
      this.emit('system-metrics', metrics)

      if (this.trackedPids.size > 0) {
        const processMetrics = await this.collectProcessMetrics()
        this.emit('process-metrics', processMetrics)
      }
    }, intervalMs)
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }

  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    // Calculate CPU usage
    let idle = 0
    let total = 0
    for (const cpu of cpus) {
      idle += cpu.times.idle
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
    }

    let cpuPercent = 0
    if (this.previousCpuTimes) {
      const idleDiff = idle - this.previousCpuTimes.idle
      const totalDiff = total - this.previousCpuTimes.total
      cpuPercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0
    }
    this.previousCpuTimes = { idle, total }

    return {
      cpuUsagePercent: cpuPercent,
      cpuCores: cpus.length,
      memoryTotalBytes: totalMem,
      memoryUsedBytes: totalMem - freeMem,
      memoryFreeBytes: freeMem,
      uptimeSeconds: Math.floor(os.uptime()),
      platform: os.platform(),
      hostname: os.hostname(),
      timestamp: new Date().toISOString()
    }
  }

  async scanFileSystem(request: SystemScanRequest = {}): Promise<SystemScanResult> {
    const rootPath = path.resolve(request.path || os.homedir())
    const maxFiles = Math.min(Math.max(request.maxFiles || 50000, 100), 250000)
    const minSizeBytes = Math.max(request.minSizeBytes || 0, 0)
    const summaries = new Map<string, SystemFileTypeSummary>()
    const largestFiles: SystemFileEntry[] = []
    let scannedFiles = 0
    let skippedEntries = 0
    let totalBytes = 0

    if (isProtectedSystemPath(rootPath)) {
      throw new Error('Protected OS folders are not scanned')
    }

    const addLargestFile = (entry: SystemFileEntry): void => {
      largestFiles.push(entry)
      largestFiles.sort((a, b) => b.sizeBytes - a.sizeBytes)
      if (largestFiles.length > 200) largestFiles.pop()
    }

    const visitDirectory = async (dirPath: string): Promise<void> => {
      if (scannedFiles >= maxFiles) return

      let dir
      try {
        dir = await fs.opendir(dirPath)
      } catch {
        skippedEntries += 1
        return
      }

      for await (const dirent of dir) {
        if (scannedFiles >= maxFiles) break
        const entryPath = path.join(dirPath, dirent.name)

        try {
          if (isProtectedSystemPath(entryPath)) {
            skippedEntries += 1
            continue
          }

          if (dirent.isSymbolicLink()) {
            skippedEntries += 1
            continue
          }

          if (dirent.isDirectory()) {
            await visitDirectory(entryPath)
            continue
          }

          if (!dirent.isFile()) {
            skippedEntries += 1
            continue
          }

          const stats = await fs.stat(entryPath)
          scannedFiles += 1
          totalBytes += stats.size

          if (stats.size < minSizeBytes) continue

          const extension = getExtension(entryPath)
          const category = categorizeExtension(extension)
          const key = `${category}:${extension}`
          const current = summaries.get(key) || {
            category,
            extension,
            count: 0,
            totalBytes: 0,
            largestBytes: 0
          }

          current.count += 1
          current.totalBytes += stats.size
          current.largestBytes = Math.max(current.largestBytes, stats.size)
          summaries.set(key, current)

          addLargestFile({
            path: entryPath,
            name: path.basename(entryPath),
            extension,
            category,
            sizeBytes: stats.size,
            modifiedAt: stats.mtime.toISOString()
          })
        } catch {
          skippedEntries += 1
        }
      }
    }

    await visitDirectory(rootPath)

    return {
      rootPath,
      scannedFiles,
      skippedEntries,
      totalBytes,
      disk: await getDiskInfo(rootPath),
      categories: [...summaries.values()].sort((a, b) => b.totalBytes - a.totalBytes),
      largestFiles,
      scannedAt: new Date().toISOString()
    }
  }

  async collectProcessMetrics(): Promise<ProcessMetrics[]> {
    const metrics: ProcessMetrics[] = []
    const totalMem = os.totalmem()

    for (const [pid, projectId] of this.trackedPids) {
      try {
        const m = await this.getProcessStats(pid)
        if (m) {
          metrics.push({
            pid,
            projectId,
            cpuPercent: m.cpu,
            memoryBytes: m.memory,
            memoryPercent: (m.memory / totalMem) * 100,
            timestamp: new Date().toISOString()
          })
        }
      } catch {
        // Process may have exited
        this.trackedPids.delete(pid)
      }
    }

    return metrics
  }

  private async getProcessStats(
    pid: number
  ): Promise<{ cpu: number; memory: number } | null> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          `wmic process where ProcessId=${pid} get WorkingSetSize /format:value`
        )
        const memMatch = stdout.match(/WorkingSetSize=(\d+)/)
        return {
          cpu: 0,
          memory: memMatch ? parseInt(memMatch[1], 10) : 0
        }
      } else {
        const { stdout } = await execAsync(`ps -p ${pid} -o %cpu=,rss= 2>/dev/null`)
        const parts = stdout.trim().split(/\s+/)
        if (parts.length >= 2) {
          return {
            cpu: parseFloat(parts[0]) || 0,
            memory: (parseInt(parts[1], 10) || 0) * 1024 // RSS is in KB
          }
        }
      }
    } catch {
      // Process doesn't exist
    }
    return null
  }
}

export const systemMonitor = new SystemMonitor()

export function isProtectedSystemPath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath)
  const normalizedPath = process.platform === 'win32'
    ? resolvedPath.toLowerCase()
    : resolvedPath
  const rootPath = path.parse(resolvedPath).root

  if (resolvedPath === rootPath) return false

  const protectedPaths = getProtectedSystemPaths().map((protectedPath) =>
    process.platform === 'win32'
      ? path.resolve(protectedPath).toLowerCase()
      : path.resolve(protectedPath)
  )

  return protectedPaths.some((protectedPath) =>
    normalizedPath === protectedPath || normalizedPath.startsWith(`${protectedPath}${path.sep}`)
  )
}

function getExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return ext || '[none]'
}

function categorizeExtension(extension: string): SystemFileCategory {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'html', 'json', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'php', 'rb', 'sh', 'sql', 'md'].includes(ext)) return 'code'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tif', 'tiff', 'heic', 'avif'].includes(ext)) return 'images'
  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'wmv'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio'
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext)) return 'documents'
  if (['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'bz2', 'xz', 'dmg', 'iso'].includes(ext)) return 'archives'
  if (['db', 'sqlite', 'sqlite3', 'parquet', 'xml', 'yaml', 'yml', 'toml', 'lock'].includes(ext)) return 'data'
  if (['exe', 'msi', 'app', 'deb', 'rpm', 'bin', 'run'].includes(ext)) return 'executables'
  if (['log', 'out', 'err'].includes(ext)) return 'logs'
  return 'other'
}

function getProtectedSystemPaths(): string[] {
  if (process.platform === 'win32') {
    const systemDrive = process.env.SystemDrive || 'C:'
    const windir = process.env.WINDIR || `${systemDrive}\\Windows`
    const programFiles = process.env.ProgramFiles || `${systemDrive}\\Program Files`
    const programFilesX86 = process.env['ProgramFiles(x86)'] || `${systemDrive}\\Program Files (x86)`
    const programData = process.env.ProgramData || `${systemDrive}\\ProgramData`

    return [
      windir,
      programFiles,
      programFilesX86,
      programData,
      `${systemDrive}\\Recovery`,
      `${systemDrive}\\System Volume Information`,
      `${systemDrive}\\$Recycle.Bin`
    ]
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications',
      '/Library',
      '/System',
      '/Volumes',
      '/bin',
      '/cores',
      '/dev',
      '/etc',
      '/opt',
      '/private',
      '/sbin',
      '/tmp',
      '/usr',
      '/var'
    ]
  }

  return [
    '/bin',
    '/boot',
    '/dev',
    '/etc',
    '/lib',
    '/lib32',
    '/lib64',
    '/libx32',
    '/lost+found',
    '/opt',
    '/proc',
    '/root',
    '/run',
    '/sbin',
    '/snap',
    '/sys',
    '/tmp',
    '/usr',
    '/var'
  ]
}

async function getDiskInfo(targetPath: string): Promise<SystemDiskInfo | null> {
  try {
    const stats = await fs.statfs(targetPath)
    const totalBytes = stats.blocks * stats.bsize
    const freeBytes = stats.bavail * stats.bsize
    const usedBytes = Math.max(totalBytes - freeBytes, 0)
    return {
      path: targetPath,
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
    }
  } catch {
    return null
  }
}
