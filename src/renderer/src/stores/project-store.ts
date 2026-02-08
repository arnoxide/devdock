import { create } from 'zustand'
import { ProjectConfig, ProjectRuntime } from '../../../shared/types'

interface ProjectStore {
  projects: ProjectConfig[]
  runtimes: Record<string, ProjectRuntime>
  loading: boolean

  loadProjects: () => Promise<void>
  addProject: (path: string) => Promise<ProjectConfig>
  removeProject: (id: string) => Promise<void>
  updateProject: (config: Partial<ProjectConfig> & { id: string }) => Promise<void>
  updateRuntime: (runtime: ProjectRuntime) => void
  setRuntimes: (runtimes: ProjectRuntime[]) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  runtimes: {},
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    try {
      const projects = await window.api.listProjects()
      const runtimes = await window.api.getAllProcessStatuses()
      const runtimeMap: Record<string, ProjectRuntime> = {}
      for (const r of runtimes) {
        runtimeMap[r.projectId] = r
      }
      set({ projects, runtimes: runtimeMap, loading: false })
    } catch (err) {
      console.error('Failed to load projects:', err)
      set({ loading: false })
    }
  },

  addProject: async (path: string) => {
    const project = await window.api.addProject(path)
    set((state) => ({ projects: [...state.projects, project] }))
    return project
  },

  removeProject: async (id: string) => {
    await window.api.removeProject(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id)
    }))
  },

  updateProject: async (config) => {
    const updated = await window.api.updateProject(config)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === config.id ? updated : p))
    }))
  },

  updateRuntime: (runtime) => {
    set((state) => ({
      runtimes: { ...state.runtimes, [runtime.projectId]: runtime }
    }))
  },

  setRuntimes: (runtimes) => {
    const map: Record<string, ProjectRuntime> = {}
    for (const r of runtimes) {
      map[r.projectId] = r
    }
    set({ runtimes: map })
  }
}))
