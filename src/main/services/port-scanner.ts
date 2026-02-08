import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { PortInfo } from '../../shared/types'

const execAsync = promisify(exec)

export class PortScanner {
  async scan(): Promise<PortInfo[]> {
    if (process.platform === 'linux') {
      return this.scanLinux()
    } else if (process.platform === 'darwin') {
      return this.scanMac()
    } else {
      return this.scanWindows()
    }
  }

  async kill(port: number): Promise<{ success: boolean; error?: string }> {
    try {
      const ports = await this.scan()
      const entry = ports.find((p) => p.port === port)
      if (!entry) {
        return { success: false, error: `No process found on port ${port}` }
      }

      if (process.platform === 'win32') {
        await execAsync(`taskkill /PID ${entry.pid} /F`)
      } else {
        process.kill(entry.pid, 'SIGKILL')
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  private async scanLinux(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execAsync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null')
      return this.parseSsOutput(stdout)
    } catch {
      return []
    }
  }

  private async scanMac(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -nP 2>/dev/null')
      return this.parseLsofOutput(stdout)
    } catch {
      return []
    }
  }

  private async scanWindows(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execAsync('netstat -ano | findstr LISTENING')
      return this.parseNetstatOutput(stdout)
    } catch {
      return []
    }
  }

  private parseSsOutput(output: string): PortInfo[] {
    const results: PortInfo[] = []
    const lines = output.split('\n').slice(1) // Skip header

    for (const line of lines) {
      if (!line.trim()) continue
      // ss format: State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) continue

      const localAddr = parts[3] || ''
      const portMatch = localAddr.match(/:(\d+)$/)
      if (!portMatch) continue

      const port = parseInt(portMatch[1], 10)
      const processInfo = parts.slice(5).join(' ')
      const pidMatch = processInfo.match(/pid=(\d+)/)
      const nameMatch = processInfo.match(/\("([^"]+)"/)

      results.push({
        port,
        pid: pidMatch ? parseInt(pidMatch[1], 10) : 0,
        processName: nameMatch ? nameMatch[1] : 'unknown',
        protocol: 'tcp',
        state: 'LISTEN',
        localAddress: localAddr.replace(`:${port}`, ''),
        projectId: null
      })
    }

    return results
  }

  private parseLsofOutput(output: string): PortInfo[] {
    const results: PortInfo[] = []
    const lines = output.split('\n').slice(1)

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.trim().split(/\s+/)
      if (parts.length < 9) continue

      const name = parts[0]
      const pid = parseInt(parts[1], 10)
      const addrPort = parts[8]
      const portMatch = addrPort.match(/:(\d+)$/)
      if (!portMatch) continue

      results.push({
        port: parseInt(portMatch[1], 10),
        pid,
        processName: name,
        protocol: 'tcp',
        state: 'LISTEN',
        localAddress: addrPort.replace(`:${portMatch[1]}`, ''),
        projectId: null
      })
    }

    return results
  }

  private parseNetstatOutput(output: string): PortInfo[] {
    const results: PortInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) continue

      const localAddr = parts[1]
      const portMatch = localAddr.match(/:(\d+)$/)
      if (!portMatch) continue

      results.push({
        port: parseInt(portMatch[1], 10),
        pid: parseInt(parts[4], 10) || 0,
        processName: 'unknown',
        protocol: 'tcp',
        state: 'LISTEN',
        localAddress: localAddr.replace(`:${portMatch[1]}`, ''),
        projectId: null
      })
    }

    return results
  }
}

export const portScanner = new PortScanner()
