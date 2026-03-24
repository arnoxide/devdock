import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { startTunnel, stopTunnel, getTunnelUrl } from '../services/tunnel-service'
import fs from 'fs'
import path from 'path'

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']

export function registerTunnelHandlers(): void {
  ipcMain.handle(IPC.TUNNEL_START, async (_e, projectId: string, port: number) => {
    return startTunnel(projectId, port) // returns { url, password }
  })

  ipcMain.handle(IPC.TUNNEL_STOP, (_e, projectId: string) => {
    stopTunnel(projectId)
  })

  ipcMain.handle(IPC.TUNNEL_GET_URL, (_e, projectId: string) => {
    return getTunnelUrl(projectId)
  })

  // Patch vite config to allow all tunnel hosts
  ipcMain.handle(IPC.TUNNEL_PATCH_VITE, (_e, projectPath: string) => {
    for (const file of VITE_CONFIGS) {
      const configPath = path.join(projectPath, file)
      if (!fs.existsSync(configPath)) continue

      let content = fs.readFileSync(configPath, 'utf-8')

      // Already patched
      if (content.includes('allowedHosts')) return { patched: false, reason: 'already set' }

      // Try to inject into existing server: { ... } block
      if (/server\s*:\s*\{/.test(content)) {
        content = content.replace(/server\s*:\s*\{/, "server: {\n      allowedHosts: 'all',")
      } else {
        // Inject a server block before the closing of defineConfig({...})
        content = content.replace(
          /\}\s*\)\s*$/,
          "  server: {\n    allowedHosts: 'all'\n  }\n})"
        )
      }

      fs.writeFileSync(configPath, content, 'utf-8')
      return { patched: true, file }
    }

    return { patched: false, reason: 'no vite config found' }
  })
}
