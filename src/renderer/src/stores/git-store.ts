import { create } from 'zustand'
import { GitCreatePullRequestRequest, GitCreatePullRequestResult, GitOperationResult, GitStatus } from '../../../shared/types'

function normalizeGitError(err: any): string {
    const message = String(err?.message || err || 'Git operation failed.')

    if (message.includes('NO_UPSTREAM_BRANCH') || message.includes('No upstream branch configured')) {
        return 'This branch is not published yet. Publish it once to set upstream tracking, then pull and push will work normally.'
    }

    if (
        message.includes('GIT_AUTH_REQUIRED') ||
        message.includes('could not read Username') ||
        message.includes('Authentication failed') ||
        message.includes('terminal prompts disabled')
    ) {
        return 'GitHub authentication is required for this HTTPS remote. Use an SSH remote, or sign in with a Git credential helper/token before pushing or pulling.'
    }

    if (message.includes('exited with code null') || message.includes('ETIMEDOUT')) {
        return 'Git did not respond in time. Check your remote connection or credentials, then try again.'
    }

    if (message.includes('Need to specify how to reconcile divergent branches')) {
        return 'Your branch and the remote both have new commits. Pull with merge or pull with rebase to choose how DevDock reconciles them.'
    }

    return message
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim()
}

interface GitStore {
    statuses: Record<string, GitStatus | null>
    loading: Record<string, boolean>
    error: Record<string, string | null>
    lastOperation: Record<string, GitOperationResult | null>
    sshKey: { publicKey: string; hasKey: boolean } | null
    allSshKeys: { name: string; path: string }[]

    loadStatus: (projectId: string) => Promise<void>
    commit: (projectId: string, message: string) => Promise<void>
    push: (projectId: string) => Promise<void>
    pull: (projectId: string, options?: { rebase?: boolean }) => Promise<void>
    init: (projectId: string) => Promise<void>
    sync: (projectId: string) => Promise<void>
    setRemote: (projectId: string, url: string) => Promise<void>
    getRemote: (projectId: string) => Promise<string | null>
    createPullRequest: (request: GitCreatePullRequestRequest) => Promise<GitCreatePullRequestResult>

    // SSH
    loadSshKey: () => Promise<void>
    loadAllSshKeys: () => Promise<void>
    generateSshKey: (email: string, name?: string) => Promise<void>
    deleteSshKey: (name: string) => Promise<void>
    testSshConnection: (name?: string) => Promise<{ success: boolean; message: string }>
}

export const useGitStore = create<GitStore>((set, get) => ({
    statuses: {},
    loading: {},
    error: {},
    lastOperation: {},
    sshKey: null,
    allSshKeys: [],

    loadStatus: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            const status = await window.api.gitStatus(projectId)
            set(state => ({
                statuses: { ...state.statuses, [projectId]: status },
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: null }
            }))
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    commit: async (projectId: string, message: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitCommit(projectId, message)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    push: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitPush(projectId)
            await get().loadStatus(projectId)
            set(state => ({
                lastOperation: {
                    ...state.lastOperation,
                    [projectId]: {
                        title: 'Push complete',
                        output: 'Remote branch updated.'
                    }
                }
            }))
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    pull: async (projectId: string, options?: { rebase?: boolean }) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            const result = await window.api.gitPull(projectId, options)
            await get().loadStatus(projectId)
            set(state => ({
                lastOperation: { ...state.lastOperation, [projectId]: result }
            }))
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    init: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitInit(projectId)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    sync: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            const result = await window.api.gitSync(projectId)
            await get().loadStatus(projectId)
            set(state => ({
                lastOperation: { ...state.lastOperation, [projectId]: result }
            }))
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: normalizeGitError(err) }
            }))
        }
    },

    setRemote: async (projectId: string, url: string) => {
        try {
            await window.api.gitSetRemote(projectId, url)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({ error: { ...state.error, [projectId]: normalizeGitError(err) } }))
        }
    },

    getRemote: async (projectId: string) => {
        return window.api.gitGetRemote(projectId)
    },

    createPullRequest: async (request) => {
        return window.api.gitCreatePullRequest(request)
    },

    loadSshKey: async () => {
        const key = await window.api.sshGetKey()
        set({ sshKey: key })
    },

    loadAllSshKeys: async () => {
        const keys = await window.api.sshListKeys()
        set({ allSshKeys: keys })
    },

    generateSshKey: async (email: string, name?: string) => {
        await window.api.sshGenerateKey(email, name)
        await get().loadSshKey()
        await get().loadAllSshKeys()
    },

    deleteSshKey: async (name: string) => {
        await window.api.sshDeleteKey(name)
        await get().loadAllSshKeys()
    },

    testSshConnection: async (name?: string) => {
        return window.api.sshTestConnection(name)
    }
}))
