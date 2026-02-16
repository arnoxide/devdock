import { ipcMain, dialog } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { ProjectEnvVault, SecurityVaultConfig, VaultEnvironment } from '../../shared/types'
import store from '../store'
import { vaultService } from '../services/vault-service'

function getVaultConfig(): SecurityVaultConfig {
  return store.get('securityVault') as SecurityVaultConfig
}

export function registerVaultHandlers(): void {
  ipcMain.handle(IPC.VAULT_GET_VAULTS, async () => {
    return getVaultConfig().vaults
  })

  ipcMain.handle(IPC.VAULT_SAVE_VAULT, async (_e, vault: ProjectEnvVault) => {
    const config = getVaultConfig()
    const idx = config.vaults.findIndex((v) => v.projectId === vault.projectId)
    if (idx >= 0) {
      config.vaults[idx] = vault
    } else {
      config.vaults.push(vault)
    }
    store.set('securityVault', config)
    return vault
  })

  ipcMain.handle(IPC.VAULT_DELETE_VAULT, async (_e, projectId: string) => {
    const config = getVaultConfig()
    config.vaults = config.vaults.filter((v) => v.projectId !== projectId)
    store.set('securityVault', config)
  })

  ipcMain.handle(IPC.VAULT_EXPORT_ENV, async (_e, projectId: string, environment: VaultEnvironment) => {
    const config = getVaultConfig()
    const vault = config.vaults.find((v) => v.projectId === projectId)
    if (!vault) throw new Error('Vault not found')

    const result = await dialog.showSaveDialog({
      title: 'Export Environment Variables',
      defaultPath: `.env.${environment}`,
      filters: [{ name: 'Env Files', extensions: ['env', 'local'] }, { name: 'All Files', extensions: ['*'] }]
    })
    if (!result.filePath) return false

    vaultService.exportToEnvFile(vault, environment, result.filePath)
    return true
  })

  ipcMain.handle(IPC.VAULT_IMPORT_ENV, async (_e, projectId: string, projectName: string, environment: VaultEnvironment) => {
    const result = await dialog.showOpenDialog({
      title: 'Import .env File',
      filters: [{ name: 'Env Files', extensions: ['env', 'local'] }, { name: 'All Files', extensions: ['*'] }],
      properties: ['openFile']
    })
    if (result.filePaths.length === 0) return null

    const newVars = vaultService.importFromEnvFile(result.filePaths[0], environment)
    const config = getVaultConfig()
    const idx = config.vaults.findIndex((v) => v.projectId === projectId)

    if (idx >= 0) {
      // Merge: overwrite existing keys, add new ones
      const existing = config.vaults[idx]
      for (const nv of newVars) {
        if (!nv) continue
        const existIdx = existing.variables.findIndex((v) => v.key === nv.key && v.environment === nv.environment)
        if (existIdx >= 0) {
          existing.variables[existIdx] = nv
        } else {
          existing.variables.push(nv)
        }
      }
    } else {
      config.vaults.push({ projectId, projectName, variables: newVars.filter(Boolean) as any })
    }

    store.set('securityVault', config)
    return config.vaults.find((v) => v.projectId === projectId)
  })

  ipcMain.handle(IPC.VAULT_ENCRYPT_VALUE, async (_e, value: string) => {
    return vaultService.encryptValue(value)
  })

  ipcMain.handle(IPC.VAULT_DECRYPT_VALUE, async (_e, encrypted: string) => {
    return vaultService.decryptValue(encrypted)
  })
}
