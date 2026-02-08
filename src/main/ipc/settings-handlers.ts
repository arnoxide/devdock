import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { GlobalSettings } from '../../shared/types'
import store from '../store'

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
}
