import { EventEmitter } from 'node:events'
import {
  GitHubCredentials,
  GitHubRepo,
  GitHubPR,
  GitHubIssue,
  GitHubWorkflowRun,
  GitHubNotification,
  GitHubSettings
} from '../../shared/types'
import store from '../store'

const API_BASE = 'https://api.github.com'
const TOP_REPOS = 10

export class GitHubService extends EventEmitter {
  private pollInterval: NodeJS.Timeout | null = null
  private repos: GitHubRepo[] = []
  private prs: GitHubPR[] = []
  private issues: GitHubIssue[] = []
  private actions: GitHubWorkflowRun[] = []
  private notifications: GitHubNotification[] = []

  // --- Settings ---

  private getSettings(): GitHubSettings {
    return store.get('github', {
      credentials: null,
      pollingIntervalMs: 60000,
      enabled: false
    })
  }

  private saveSettings(settings: GitHubSettings): void {
    store.set('github', settings)
  }

  getCredentials(): GitHubCredentials | null {
    return this.getSettings().credentials
  }

  async setToken(token: string): Promise<GitHubCredentials> {
    const user = await this.fetchApi<{ login: string; avatar_url: string }>('/user', token)
    const creds: GitHubCredentials = {
      token,
      username: user.login,
      avatarUrl: user.avatar_url,
      enabled: true
    }
    const settings = this.getSettings()
    settings.credentials = creds
    settings.enabled = true
    this.saveSettings(settings)
    return creds
  }

  removeToken(): void {
    const settings = this.getSettings()
    settings.credentials = null
    settings.enabled = false
    this.saveSettings(settings)
    this.repos = []
    this.prs = []
    this.issues = []
    this.actions = []
    this.notifications = []
    this.stopPolling()
  }

  async testConnection(token?: string): Promise<{ ok: boolean; username?: string; error?: string }> {
    const t = token || this.getSettings().credentials?.token
    if (!t) return { ok: false, error: 'No token configured' }
    try {
      const user = await this.fetchApi<{ login: string }>('/user', t)
      return { ok: true, username: user.login }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  }

  // --- Polling ---

  startPolling(): void {
    if (this.pollInterval) return
    const settings = this.getSettings()
    if (!settings.credentials?.token) return

    this.pollAll()
    this.pollInterval = setInterval(() => this.pollAll(), settings.pollingIntervalMs)
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  async refreshNow(): Promise<void> {
    await this.pollAll()
  }

  private async pollAll(): Promise<void> {
    const creds = this.getSettings().credentials
    if (!creds?.token || !creds.enabled) return

    try {
      await this.fetchRepos(creds.token)
      const topRepos = this.repos.slice(0, TOP_REPOS)

      await Promise.allSettled([
        this.fetchPRs(creds.token, topRepos),
        this.fetchIssues(creds.token, topRepos),
        this.fetchActions(creds.token, topRepos),
        this.fetchNotifications(creds.token)
      ])
    } catch {
      // Swallow — individual fetchers handle their own errors
    }
  }

  // --- Data Getters ---

  getRepos(): GitHubRepo[] {
    return this.repos
  }

  getPRs(): GitHubPR[] {
    return this.prs
  }

  getIssues(): GitHubIssue[] {
    return this.issues
  }

  getActions(): GitHubWorkflowRun[] {
    return this.actions
  }

  getNotifications(): GitHubNotification[] {
    return this.notifications
  }

  // --- Notification Actions ---

  async markNotificationRead(threadId: string): Promise<void> {
    const creds = this.getSettings().credentials
    if (!creds?.token) return
    await this.fetchApi(`/notifications/threads/${threadId}`, creds.token, 'PATCH')
    this.notifications = this.notifications.map((n) =>
      n.id === threadId ? { ...n, unread: false } : n
    )
    this.emit('notifications-update', this.notifications)
  }

  async markAllNotificationsRead(): Promise<void> {
    const creds = this.getSettings().credentials
    if (!creds?.token) return
    await this.fetchApi('/notifications', creds.token, 'PUT', { read: true })
    this.notifications = this.notifications.map((n) => ({ ...n, unread: false }))
    this.emit('notifications-update', this.notifications)
  }

  // --- Fetchers ---

  private async fetchRepos(token: string): Promise<void> {
    try {
      const raw = await this.fetchApi<any[]>('/user/repos?sort=updated&per_page=30', token)
      this.repos = raw.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        htmlUrl: r.html_url,
        language: r.language,
        stargazersCount: r.stargazers_count,
        forksCount: r.forks_count,
        openIssuesCount: r.open_issues_count,
        isPrivate: r.private,
        updatedAt: r.updated_at,
        defaultBranch: r.default_branch
      }))
      this.emit('repos-update', this.repos)
    } catch {
      // Keep stale data
    }
  }

  private async fetchPRs(token: string, repos: GitHubRepo[]): Promise<void> {
    try {
      const allPRs: GitHubPR[] = []
      const results = await Promise.allSettled(
        repos.map((repo) =>
          this.fetchApi<any[]>(
            `/repos/${repo.fullName}/pulls?state=all&per_page=10&sort=updated`,
            token
          ).then((prs) =>
            prs.map((p) => ({
              id: p.id,
              number: p.number,
              title: p.title,
              state: p.state,
              htmlUrl: p.html_url,
              repoFullName: repo.fullName,
              user: p.user?.login || 'unknown',
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              draft: p.draft || false,
              labels: (p.labels || []).map((l: any) => l.name),
              headBranch: p.head?.ref || '',
              baseBranch: p.base?.ref || ''
            }))
          )
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allPRs.push(...r.value)
      }
      this.prs = allPRs.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      this.emit('prs-update', this.prs)
    } catch {
      // Keep stale
    }
  }

  private async fetchIssues(token: string, repos: GitHubRepo[]): Promise<void> {
    try {
      const allIssues: GitHubIssue[] = []
      const results = await Promise.allSettled(
        repos.map((repo) =>
          this.fetchApi<any[]>(
            `/repos/${repo.fullName}/issues?state=all&per_page=10&sort=updated`,
            token
          ).then((items) =>
            items
              .filter((i) => !i.pull_request) // Filter out PRs from issues endpoint
              .map((i) => ({
                id: i.id,
                number: i.number,
                title: i.title,
                state: i.state,
                htmlUrl: i.html_url,
                repoFullName: repo.fullName,
                user: i.user?.login || 'unknown',
                createdAt: i.created_at,
                updatedAt: i.updated_at,
                labels: (i.labels || []).map((l: any) => l.name),
                commentCount: i.comments || 0
              }))
          )
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allIssues.push(...r.value)
      }
      this.issues = allIssues.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      this.emit('issues-update', this.issues)
    } catch {
      // Keep stale
    }
  }

  private async fetchActions(token: string, repos: GitHubRepo[]): Promise<void> {
    try {
      const allRuns: GitHubWorkflowRun[] = []
      const results = await Promise.allSettled(
        repos.map((repo) =>
          this.fetchApi<{ workflow_runs: any[] }>(
            `/repos/${repo.fullName}/actions/runs?per_page=5`,
            token
          ).then((data) =>
            (data.workflow_runs || []).map((r) => ({
              id: r.id,
              name: r.name,
              status: r.status,
              conclusion: r.conclusion,
              htmlUrl: r.html_url,
              repoFullName: repo.fullName,
              headBranch: r.head_branch || '',
              event: r.event,
              createdAt: r.created_at,
              updatedAt: r.updated_at
            }))
          )
        )
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allRuns.push(...r.value)
      }
      this.actions = allRuns.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      this.emit('actions-update', this.actions)
    } catch {
      // Keep stale
    }
  }

  private async fetchNotifications(token: string): Promise<void> {
    try {
      const raw = await this.fetchApi<any[]>('/notifications', token)
      this.notifications = raw.map((n) => ({
        id: n.id,
        reason: n.reason,
        subject: {
          title: n.subject?.title || '',
          type: n.subject?.type || '',
          url: n.subject?.url || null
        },
        repository: n.repository?.full_name || '',
        unread: n.unread,
        updatedAt: n.updated_at
      }))
      this.emit('notifications-update', this.notifications)
    } catch {
      // Keep stale
    }
  }

  // --- HTTP ---

  private async fetchApi<T>(
    path: string,
    token: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`)
    }

    if (res.status === 204 || method === 'PUT' || method === 'PATCH') {
      return {} as T
    }

    return res.json()
  }

  shutdown(): void {
    this.stopPolling()
  }
}

export const githubService = new GitHubService()
