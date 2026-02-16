import { registerProjectHandlers } from './project-handlers'
import { registerProcessHandlers } from './process-handlers'
import { registerPortHandlers } from './port-handlers'
import { registerApiHandlers } from './api-handlers'
import { registerDbHandlers } from './db-handlers'
import { registerSystemHandlers } from './system-handlers'
import { registerLogHandlers } from './log-handlers'
import { registerEnvHandlers } from './env-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerProdMetricsHandlers } from './prod-metrics-handlers'
import { registerGitHubHandlers } from './github-handlers'
import { registerGitHandlers } from './git-handlers'
import { registerVaultHandlers } from './vault-handlers'

function safeRegister(name: string, register: () => void): void {
  try {
    register()
  } catch (err) {
    console.error(`[DevDock] Failed to register ${name} handlers:`, err)
  }
}

export function registerAllHandlers(): void {
  safeRegister('project', registerProjectHandlers)
  safeRegister('process', registerProcessHandlers)
  safeRegister('port', registerPortHandlers)
  safeRegister('api', registerApiHandlers)
  safeRegister('db', registerDbHandlers)
  safeRegister('system', registerSystemHandlers)
  safeRegister('log', registerLogHandlers)
  safeRegister('env', registerEnvHandlers)
  safeRegister('settings', registerSettingsHandlers)
  safeRegister('prod-metrics', registerProdMetricsHandlers)
  safeRegister('github', registerGitHubHandlers)
  safeRegister('git', registerGitHandlers)
  safeRegister('vault', registerVaultHandlers)

  // Terminal handlers use node-pty (native module) — load dynamically
  // so a failed native build doesn't prevent the app from starting
  try {
    const { registerTerminalHandlers } = require('./terminal-handlers')
    registerTerminalHandlers()
  } catch (err) {
    console.error('[DevDock] Failed to register terminal handlers (node-pty may not be built):', err)
  }
}
