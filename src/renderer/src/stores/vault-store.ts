import { create } from 'zustand'
import { ProjectEnvVault, VaultEnvironment } from '../../../shared/types'

interface VaultStore {
  vaults: ProjectEnvVault[]
  loading: boolean

  loadVaults: () => Promise<void>
  saveVault: (vault: ProjectEnvVault) => Promise<void>
  deleteVault: (projectId: string) => Promise<void>
  exportEnv: (projectId: string, environment: VaultEnvironment) => Promise<boolean>
  importEnv: (projectId: string, projectName: string, environment: VaultEnvironment) => Promise<void>
  encryptValue: (value: string) => Promise<string>
  decryptValue: (encrypted: string) => Promise<string>
}

export const useVaultStore = create<VaultStore>((set) => ({
  vaults: [],
  loading: false,

  loadVaults: async () => {
    set({ loading: true })
    const vaults = (await window.api.vaultGetVaults()) as ProjectEnvVault[]
    set({ vaults: vaults || [], loading: false })
  },

  saveVault: async (vault: ProjectEnvVault) => {
    const saved = (await window.api.vaultSaveVault(vault)) as ProjectEnvVault
    set((s) => {
      const idx = s.vaults.findIndex((v) => v.projectId === saved.projectId)
      const vaults = [...s.vaults]
      if (idx >= 0) {
        vaults[idx] = saved
      } else {
        vaults.push(saved)
      }
      return { vaults }
    })
  },

  deleteVault: async (projectId: string) => {
    await window.api.vaultDeleteVault(projectId)
    set((s) => ({ vaults: s.vaults.filter((v) => v.projectId !== projectId) }))
  },

  exportEnv: async (projectId: string, environment: VaultEnvironment) => {
    return (await window.api.vaultExportEnv(projectId, environment)) as boolean
  },

  importEnv: async (projectId: string, projectName: string, environment: VaultEnvironment) => {
    const vault = (await window.api.vaultImportEnv(projectId, projectName, environment)) as ProjectEnvVault | null
    if (vault) {
      set((s) => {
        const idx = s.vaults.findIndex((v) => v.projectId === vault.projectId)
        const vaults = [...s.vaults]
        if (idx >= 0) {
          vaults[idx] = vault
        } else {
          vaults.push(vault)
        }
        return { vaults }
      })
    }
  },

  encryptValue: async (value: string) => {
    return (await window.api.vaultEncryptValue(value)) as string
  },

  decryptValue: async (encrypted: string) => {
    return (await window.api.vaultDecryptValue(encrypted)) as string
  }
}))
