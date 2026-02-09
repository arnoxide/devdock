import { create } from 'zustand'
import { GitStatus } from '../../../shared/types'

interface GitStore {
    statuses: Record<string, GitStatus | null>
    loading: Record<string, boolean>
    error: Record<string, string | null>

    loadStatus: (projectId: string) => Promise<void>
    commit: (projectId: string, message: string) => Promise<void>
    push: (projectId: string) => Promise<void>
    pull: (projectId: string) => Promise<void>
    init: (projectId: string) => Promise<void>
    sync: (projectId: string) => Promise<void>
}

export const useGitStore = create<GitStore>((set, get) => ({
    statuses: {},
    loading: {},
    error: {},

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
                error: { ...state.error, [projectId]: err.message }
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
                error: { ...state.error, [projectId]: err.message }
            }))
        }
    },

    push: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitPush(projectId)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: err.message }
            }))
        }
    },

    pull: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitPull(projectId)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: err.message }
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
                error: { ...state.error, [projectId]: err.message }
            }))
        }
    },

    sync: async (projectId: string) => {
        set(state => ({ loading: { ...state.loading, [projectId]: true } }))
        try {
            await window.api.gitSync(projectId)
            await get().loadStatus(projectId)
        } catch (err: any) {
            set(state => ({
                loading: { ...state.loading, [projectId]: false },
                error: { ...state.error, [projectId]: err.message }
            }))
        }
    }
}))
