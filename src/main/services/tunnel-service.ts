import { spawn, ChildProcess } from 'child_process'

export interface TunnelInfo {
  url: string
  password: string
}

interface TunnelSession {
  info: TunnelInfo
  proc: ChildProcess
}

const activeTunnels = new Map<string, TunnelSession>()

export function startTunnel(projectId: string, port: number): Promise<TunnelInfo> {
  return new Promise((resolve, reject) => {
    const existing = activeTunnels.get(projectId)
    if (existing) {
      existing.proc.kill()
      activeTunnels.delete(projectId)
    }

    const proc = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-o', 'ServerAliveCountMax=3',
      '-R', `80:localhost:${port}`,
      'nokey@localhost.run'
    ])

    let resolved = false

    const tryResolve = (text: string): void => {
      if (resolved) return
      // localhost.run prints the URL in stdout
      const match = text.match(/https?:\/\/[a-zA-Z0-9-]+\.lhr\.life/)
      if (match) {
        resolved = true
        const info: TunnelInfo = { url: match[0], password: '' }
        activeTunnels.set(projectId, { info, proc })
        resolve(info)
      }
    }

    proc.stdout.on('data', (d) => tryResolve(d.toString()))
    proc.stderr.on('data', (d) => tryResolve(d.toString()))

    proc.on('error', (err) => {
      if (!resolved) reject(new Error(`SSH not found: ${err.message}`))
    })

    proc.on('close', () => {
      activeTunnels.delete(projectId)
    })

    // Timeout if URL not received in 15s
    setTimeout(() => {
      if (!resolved) {
        proc.kill()
        reject(new Error('Tunnel timed out — check your internet connection'))
      }
    }, 15000)
  })
}

export function stopTunnel(projectId: string): void {
  const session = activeTunnels.get(projectId)
  if (session) {
    session.proc.kill()
    activeTunnels.delete(projectId)
  }
}

export function getTunnelUrl(projectId: string): string | null {
  return activeTunnels.get(projectId)?.info.url ?? null
}

export function stopAllTunnels(): void {
  for (const session of activeTunnels.values()) session.proc.kill()
  activeTunnels.clear()
}
