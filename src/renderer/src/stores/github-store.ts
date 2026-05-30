import { create } from 'zustand'
import {
  GitHubCredentials,
  GitHubRepo,
  GitHubPR,
  GitHubIssue,
  GitHubWorkflowRun,
  GitHubNotification
} from '../../../shared/types'

interface GitHubStore {
  credentials: GitHubCredentials | null
  accounts: GitHubCredentials[]
  repos: GitHubRepo[]
  prs: GitHubPR[]
  issues: GitHubIssue[]
  actions: GitHubWorkflowRun[]
  notifications: GitHubNotification[]
  loading: boolean
  connectionError: string | null

  loadCredentials: () => Promise<void>
  setToken: (token: string) => Promise<void>
  removeToken: (username?: string) => Promise<void>
  switchAccount: (username: string) => Promise<void>
  testConnection: (token?: string) => Promise<{ ok: boolean; error?: string }>
  loadAll: () => Promise<void>
  startPolling: () => Promise<void>
  stopPolling: () => Promise<void>
  markNotificationRead: (threadId: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>

  updateRepos: (repos: GitHubRepo[]) => void
  updatePRs: (prs: GitHubPR[]) => void
  updateIssues: (issues: GitHubIssue[]) => void
  updateActions: (actions: GitHubWorkflowRun[]) => void
  updateNotifications: (notifications: GitHubNotification[]) => void
}

export const useGitHubStore = create<GitHubStore>((set) => ({
  credentials: null,
  accounts: [],
  repos: [],
  prs: [],
  issues: [],
  actions: [],
  notifications: [],
  loading: false,
  connectionError: null,

  loadCredentials: async () => {
    const [creds, accounts] = await Promise.all([
      window.api.getGitHubCredentials(),
      window.api.getGitHubAccounts()
    ])
    set({
      credentials: creds as GitHubCredentials | null,
      accounts: ((accounts as GitHubCredentials[]) || [])
    })
  },

  setToken: async (token: string) => {
    set({ loading: true, connectionError: null })
    try {
      const creds = (await window.api.setGitHubToken(token)) as GitHubCredentials
      const accounts = (await window.api.getGitHubAccounts()) as GitHubCredentials[]
      set({ credentials: creds, accounts: accounts || [], loading: false })
      await useGitHubStore.getState().loadAll()
    } catch (err: any) {
      set({ loading: false, connectionError: err.message || 'Failed to set token' })
      throw err
    }
  },

  removeToken: async (username?: string) => {
    await window.api.removeGitHubToken(username)
    const [creds, accounts] = await Promise.all([
      window.api.getGitHubCredentials(),
      window.api.getGitHubAccounts()
    ])
    set({
      credentials: creds as GitHubCredentials | null,
      accounts: ((accounts as GitHubCredentials[]) || []),
      repos: [],
      prs: [],
      issues: [],
      actions: [],
      notifications: [],
      connectionError: null
    })
    if (creds) {
      await useGitHubStore.getState().loadAll()
    }
  },

  switchAccount: async (username: string) => {
    set({ loading: true, connectionError: null })
    try {
      const creds = (await window.api.switchGitHubAccount(username)) as GitHubCredentials
      const accounts = (await window.api.getGitHubAccounts()) as GitHubCredentials[]
      set({
        credentials: creds,
        accounts: accounts || [],
        repos: [],
        prs: [],
        issues: [],
        actions: [],
        notifications: []
      })
      await useGitHubStore.getState().loadAll()
    } catch (err: any) {
      set({ loading: false, connectionError: err.message || 'Failed to switch account' })
      throw err
    }
  },

  testConnection: async (token?: string) => {
    const result = (await window.api.testGitHubConnection(token)) as {
      ok: boolean
      username?: string
      error?: string
    }
    return result
  },

  loadAll: async () => {
    set({ loading: true })
    const [repos, prs, issues, actions, notifications] = await Promise.allSettled([
      window.api.getGitHubRepos(),
      window.api.getGitHubPRs(),
      window.api.getGitHubIssues(),
      window.api.getGitHubActions(),
      window.api.getGitHubNotifications()
    ])
    set({
      repos: repos.status === 'fulfilled' ? (repos.value as GitHubRepo[]) || [] : [],
      prs: prs.status === 'fulfilled' ? (prs.value as GitHubPR[]) || [] : [],
      issues: issues.status === 'fulfilled' ? (issues.value as GitHubIssue[]) || [] : [],
      actions: actions.status === 'fulfilled' ? (actions.value as GitHubWorkflowRun[]) || [] : [],
      notifications:
        notifications.status === 'fulfilled'
          ? (notifications.value as GitHubNotification[]) || []
          : [],
      loading: false
    })
  },

  startPolling: async () => {
    await window.api.startGitHubPolling()
  },

  stopPolling: async () => {
    await window.api.stopGitHubPolling()
  },

  markNotificationRead: async (threadId: string) => {
    await window.api.markGitHubNotificationRead(threadId)
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === threadId ? { ...n, unread: false } : n
      )
    }))
  },

  markAllNotificationsRead: async () => {
    await window.api.markAllGitHubNotificationsRead()
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, unread: false }))
    }))
  },

  updateRepos: (repos) => set({ repos }),
  updatePRs: (prs) => set({ prs }),
  updateIssues: (issues) => set({ issues }),
  updateActions: (actions) => set({ actions }),
  updateNotifications: (notifications) => set({ notifications })
}))
