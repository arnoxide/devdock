import { create } from 'zustand'
import { TerminalSession } from '../../../shared/types'

interface TerminalStore {
  sessions: Record<string, TerminalSession>
  // Maps projectId -> sessionId for session reuse
  projectToSession: Record<string, string>

  getOrCreateSession: (projectId: string) => Promise<TerminalSession>
  closeSession: (sessionId: string) => Promise<void>
  setSession: (session: TerminalSession) => void
  removeSession: (sessionId: string) => void
}

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  sessions: {},
  projectToSession: {},

  getOrCreateSession: async (projectId: string) => {
    // Check if backend still has a live session for this project
    const existingSession = await window.api.getTerminalByProject(projectId)
    if (existingSession) {
      // Update local state and reuse
      set((state) => ({
        sessions: { ...state.sessions, [existingSession.id]: existingSession },
        projectToSession: { ...state.projectToSession, [projectId]: existingSession.id }
      }))
      return existingSession
    }

    // Create a new session
    const session = await window.api.createTerminal(projectId)
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session },
      projectToSession: { ...state.projectToSession, [projectId]: session.id }
    }))
    return session
  },

  closeSession: async (sessionId: string) => {
    const { sessions } = get()
    const session = sessions[sessionId]
    await window.api.closeTerminal(sessionId)
    set((state) => {
      const { [sessionId]: _, ...restSessions } = state.sessions
      const newProjectMap = { ...state.projectToSession }
      if (session) delete newProjectMap[session.projectId]
      return { sessions: restSessions, projectToSession: newProjectMap }
    })
  },

  setSession: (session: TerminalSession) => {
    set((state) => ({
      sessions: { ...state.sessions, [session.id]: session }
    }))
  },

  removeSession: (sessionId: string) => {
    const { sessions } = get()
    const session = sessions[sessionId]
    set((state) => {
      const { [sessionId]: _, ...restSessions } = state.sessions
      const newProjectMap = { ...state.projectToSession }
      if (session) delete newProjectMap[session.projectId]
      return { sessions: restSessions, projectToSession: newProjectMap }
    })
  }
}))
