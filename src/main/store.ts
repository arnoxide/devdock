import Store from 'electron-store'
import { AppConfig } from '../shared/types'

const store = new Store<AppConfig>({
  name: 'devdock-config',
  defaults: {
    projects: [],
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
    }
  }
})

export default store
