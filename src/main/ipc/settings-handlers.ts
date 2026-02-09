import { ipcMain, dialog } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { GlobalSettings } from '../../shared/types'
import store, { DEVELOPMENT_DEFAULTS } from '../store'
import fs from 'fs'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return store.get('globalSettings')
  })

  ipcMain.handle(IPC.SETTINGS_UPDATE, async (_event, settings: Partial<GlobalSettings>) => {
    const current = store.get('globalSettings')
    const updated = { ...current, ...settings }
    store.set('globalSettings', updated)
    return updated
  })

  ipcMain.handle(IPC.SETTINGS_EXPORT, async () => {
    const settings = store.store
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export DevDock Configuration',
      defaultPath: 'devdock-config.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(settings, null, 2))
      return true
    }
    return false
  })

  ipcMain.handle(IPC.SETTINGS_RESET, async () => {
    store.set('globalSettings', DEVELOPMENT_DEFAULTS.globalSettings)
    return DEVELOPMENT_DEFAULTS.globalSettings
  })
}
