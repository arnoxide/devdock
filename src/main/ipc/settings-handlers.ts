import { ipcMain, dialog } from 'electron'
import bcrypt from 'bcryptjs'
import { IPC } from '../../shared/ipc-channels'
import { GlobalSettings } from '../../shared/types'
import store, { DEVELOPMENT_DEFAULTS } from '../store'
import { checkForUpdates, installUpdate } from '../services/updater-service'
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

  ipcMain.handle(IPC.REMOTE_GET_STATUS, async () => {
    const creds = store.get('remoteCredentials' as any) as any
    return {
      configured: !!(creds?.username && creds?.passwordHash),
      username: creds?.username || ''
    }
  })

  ipcMain.handle(IPC.UPDATE_CHECK, async () => { checkForUpdates() })
  ipcMain.handle(IPC.UPDATE_INSTALL, async () => { installUpdate() })

  ipcMain.handle(IPC.REMOTE_SET_CREDENTIALS, async (_e, username: string, password: string) => {
    if (!username?.trim() || !password?.trim()) throw new Error('Username and password are required')
    const passwordHash = await bcrypt.hash(password, 12)
    store.set('remoteCredentials' as any, { username: username.trim(), passwordHash })
    return { ok: true }
  })
}
