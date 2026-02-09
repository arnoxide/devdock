import { registerProjectHandlers } from './project-handlers'
import { registerProcessHandlers } from './process-handlers'
import { registerTerminalHandlers } from './terminal-handlers'
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

export function registerAllHandlers(): void {
  registerProjectHandlers()
  registerProcessHandlers()
  registerTerminalHandlers()
  registerPortHandlers()
  registerApiHandlers()
  registerDbHandlers()
  registerSystemHandlers()
  registerLogHandlers()
  registerEnvHandlers()
  registerSettingsHandlers()
  registerProdMetricsHandlers()
  registerGitHubHandlers()
  registerGitHandlers()
}
