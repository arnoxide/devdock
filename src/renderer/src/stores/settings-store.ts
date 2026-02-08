import { create } from 'zustand'
import { GlobalSettings } from '../../../shared/types'

interface SettingsStore {
  settings: GlobalSettings | null
  loading: boolean

  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<GlobalSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  loading: false,

  loadSettings: async () => {
    set({ loading: true })
    const settings = await window.api.getSettings()
    set({ settings, loading: false })
  },

  updateSettings: async (updates: Partial<GlobalSettings>) => {
    const updated = await window.api.updateSettings(updates)
    set({ settings: updated })
  }
}))
