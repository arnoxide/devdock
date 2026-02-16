import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { ProjectEnvVault, VaultEnvironment } from '../../shared/types'
import store from '../store'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  // Use a persistent key derived from machine-specific data
  let keyHex = store.get('_vaultKey' as any) as string | undefined
  if (!keyHex) {
    keyHex = crypto.randomBytes(32).toString('hex')
    store.set('_vaultKey' as any, keyHex)
  }
  return Buffer.from(keyHex, 'hex')
}

export class VaultService {
  encryptValue(value: string): string {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  decryptValue(encryptedValue: string): string {
    const key = getEncryptionKey()
    const parts = encryptedValue.split(':')
    if (parts.length !== 3) return encryptedValue // Not encrypted, return as-is

    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  exportToEnvFile(vault: ProjectEnvVault, environment: VaultEnvironment, filePath: string): void {
    const vars = vault.variables.filter((v) => v.environment === environment)
    const lines = vars.map((v) => {
      const value = v.isSecret ? this.decryptValue(v.value) : v.value
      // Quote values that contain spaces or special chars
      const needsQuotes = /[\s#"'\\]/.test(value)
      return `${v.key}=${needsQuotes ? `"${value}"` : value}`
    })
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
  }

  importFromEnvFile(filePath: string, environment: VaultEnvironment) {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))

    return lines.map((line) => {
      const eqIndex = line.indexOf('=')
      if (eqIndex === -1) return null
      const key = line.slice(0, eqIndex).trim()
      let value = line.slice(eqIndex + 1).trim()
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      return {
        id: crypto.randomUUID(),
        key,
        value: this.encryptValue(value),
        environment,
        isSecret: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }).filter(Boolean)
  }
}

export const vaultService = new VaultService()
