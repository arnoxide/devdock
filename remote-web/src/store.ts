import { create } from 'zustand'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Project = Record<string, any>

interface AppState {
  projects: Project[]
  setProjects: (p: Project[]) => void
  selectedProjectId: string | null
  setSelectedProject: (id: string | null) => void
  isLoggedIn: boolean
  setLoggedIn: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  projects: [],
  setProjects: (p) => set({ projects: p }),
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),
  isLoggedIn: false,
  setLoggedIn: (v) => set({ isLoggedIn: v }),
}))
