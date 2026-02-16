import Store from 'electron-store'
import { AppConfig } from '../shared/types'

export const DEVELOPMENT_DEFAULTS: AppConfig = {
  projects: [],
  databaseConnections: [],
  globalSettings: {
    theme: 'dark',
    defaultShell: process.env.SHELL || '/bin/bash',
    apiMonitorEnabled: true,
    systemMonitorIntervalMs: 3000,
    logRetentionCount: 5000,
    startMinimized: false,
    closeToTray: false
  },
  envTemplates: [],
  windowBounds: { x: 100, y: 100, width: 1400, height: 900 },
  productionMetrics: {
    credentials: [],
    pollingIntervalMs: 30000,
    enabled: false
  },
  github: {
    credentials: null,
    pollingIntervalMs: 60000,
    enabled: false
  },
  securityVault: {
    vaults: [],
    defaultPasswordLength: 16,
    defaultPasswordOptions: {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: false
    }
  }
}

const store = new Store<AppConfig>({
  name: 'devdock-config',
  defaults: DEVELOPMENT_DEFAULTS
})

export default store
