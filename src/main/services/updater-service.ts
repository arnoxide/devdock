import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { is } from '@electron-toolkit/utils'

function send(win: BrowserWindow, channel: string, data?: unknown) {
  if (!win.isDestroyed()) win.webContents.send(channel, data)
}

export function initAutoUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Don't check in dev mode
  if (is.dev) {
    console.log('[Updater] Skipping update check in dev mode')
    return
  }

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    send(win, IPC.UPDATE_AVAILABLE, { version: info.version, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('update-not-available', () => {
    send(win, IPC.UPDATE_NOT_AVAILABLE)
  })

  autoUpdater.on('download-progress', (progress) => {
    send(win, IPC.UPDATE_PROGRESS, { percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    send(win, IPC.UPDATE_DOWNLOADED, { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message)
    send(win, IPC.UPDATE_ERROR, { message: err.message })
  })

  // Check on startup (delay a bit so app is fully loaded)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Updater] Check failed:', err.message)
    })
  }, 5000)
}

export function checkForUpdates(): void {
  if (!is.dev) autoUpdater.checkForUpdates()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
