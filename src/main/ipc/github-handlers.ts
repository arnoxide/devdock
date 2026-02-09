import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { githubService } from '../services/github-service'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerGitHubHandlers(): void {
  // Forward service events to renderer
  const events = [
    ['repos-update', IPC.GITHUB_REPOS_UPDATE],
    ['prs-update', IPC.GITHUB_PRS_UPDATE],
    ['issues-update', IPC.GITHUB_ISSUES_UPDATE],
    ['actions-update', IPC.GITHUB_ACTIONS_UPDATE],
    ['notifications-update', IPC.GITHUB_NOTIFICATIONS_UPDATE]
  ] as const

  for (const [event, channel] of events) {
    githubService.on(event, (data) => {
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data)
      }
    })
  }

  // Token management
  ipcMain.handle(IPC.GITHUB_SET_TOKEN, async (_event, token: string) => {
    return githubService.setToken(token)
  })

  ipcMain.handle(IPC.GITHUB_REMOVE_TOKEN, async () => {
    githubService.removeToken()
  })

  ipcMain.handle(IPC.GITHUB_GET_CREDENTIALS, async () => {
    return githubService.getCredentials()
  })

  ipcMain.handle(IPC.GITHUB_TEST_CONNECTION, async (_event, token?: string) => {
    return githubService.testConnection(token)
  })

  // Data retrieval
  ipcMain.handle(IPC.GITHUB_GET_REPOS, async () => {
    return githubService.getRepos()
  })

  ipcMain.handle(IPC.GITHUB_GET_PRS, async () => {
    return githubService.getPRs()
  })

  ipcMain.handle(IPC.GITHUB_GET_ISSUES, async () => {
    return githubService.getIssues()
  })

  ipcMain.handle(IPC.GITHUB_GET_ACTIONS, async () => {
    return githubService.getActions()
  })

  ipcMain.handle(IPC.GITHUB_GET_NOTIFICATIONS, async () => {
    return githubService.getNotifications()
  })

  // Notification actions
  ipcMain.handle(IPC.GITHUB_MARK_NOTIFICATION_READ, async (_event, threadId: string) => {
    await githubService.markNotificationRead(threadId)
  })

  ipcMain.handle(IPC.GITHUB_MARK_ALL_NOTIFICATIONS_READ, async () => {
    await githubService.markAllNotificationsRead()
  })

  // Polling control
  ipcMain.handle(IPC.GITHUB_START_POLLING, async () => {
    githubService.startPolling()
  })

  ipcMain.handle(IPC.GITHUB_STOP_POLLING, async () => {
    githubService.stopPolling()
  })
}
