import os from 'node:os'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { EventEmitter } from 'node:events'
import { SystemMetrics, ProcessMetrics } from '../../shared/types'

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
