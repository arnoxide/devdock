import { ipcMain, dialog, app } from 'electron'
import bcrypt from 'bcryptjs'
import { IPC } from '../../shared/ipc-channels'
import { GlobalSettings } from '../../shared/types'
import store, { DEVELOPMENT_DEFAULTS } from '../store'
import { checkForUpdates, installUpdate } from '../services/updater-service'
import fs from 'fs'
import path from 'path'
import os from 'os'

function applyLaunchAtStartup(enable: boolean): void {
  if (process.platform === 'linux') {
    const autostartDir = path.join(os.homedir(), '.config', 'autostart')
    const desktopFile = path.join(autostartDir, 'devdock.desktop')
    if (enable) {
      const execPath = app.getPath('exe')
      const content = `[Desktop Entry]\nType=Application\nName=DevDock\nExec=${execPath}\nIcon=devdock\nX-GNOME-Autostart-enabled=true\nComment=DevDock - Local Dev Manager\n`
      fs.mkdirSync(autostartDir, { recursive: true })
      fs.writeFileSync(desktopFile, content)
    } else {
      if (fs.existsSync(desktopFile)) fs.unlinkSync(desktopFile)
    }
  } else {
    app.setLoginItemSettings({ openAtLogin: enable })
  }
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return store.get('globalSettings')
  })

  ipcMain.handle(IPC.SETTINGS_UPDATE, async (_event, settings: Partial<GlobalSettings>) => {
    const current = store.get('globalSettings')
    const updated = { ...current, ...settings }
    store.set('globalSettings', updated)
    if ('launchAtStartup' in settings) {
      applyLaunchAtStartup(!!settings.launchAtStartup)
    }
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

  // Sync startup setting on app init
  const saved = store.get('globalSettings')
  applyLaunchAtStartup(!!(saved as GlobalSettings).launchAtStartup)

  ipcMain.handle(IPC.REMOTE_SET_CREDENTIALS, async (_e, username: string, password: string) => {
    if (!username?.trim() || !password?.trim()) throw new Error('Username and password are required')
    const passwordHash = await bcrypt.hash(password, 12)
    store.set('remoteCredentials' as any, { username: username.trim(), passwordHash })
    return { ok: true }
  })
}
