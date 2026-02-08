import { create } from 'zustand'
import { TerminalSession } from '../../../shared/types'

interface TerminalStore {
  sessions: Record<string, TerminalSession>

  createSession: (projectId: string) => Promise<TerminalSession>
  closeSession: (sessionId: string) => Promise<void>
  setSession: (session: TerminalSession) => void
  removeSession: (sessionId: string) => void
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: {},

  createSession: async (projectId: string) => {
    const session = await window.api.createTerminal(projectId)
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session }
    }))
    return session
  },

  closeSession: async (sessionId: string) => {
    await window.api.closeTerminal(sessionId)
    set((state) => {
      const { [sessionId]: _, ...rest } = state.sessions
      return { sessions: rest }
    })
  },

  setSession: (session: TerminalSession) => {
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session }
    }))
  },

  removeSession: (sessionId: string) => {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.sessions
      return { sessions: rest }
    })
  }
}))
