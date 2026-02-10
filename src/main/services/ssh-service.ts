import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'

const execAsync = promisify(exec)

export interface SshKeyInfo {
    publicKey: string
    hasKey: boolean
}

export class SshService {
    private sshDir = path.join(os.homedir(), '.ssh')
    private keyPath = path.join(this.sshDir, 'id_rsa')
    private pubKeyPath = path.join(this.sshDir, 'id_rsa.pub')

    async getKey(filePath?: string): Promise<SshKeyInfo> {
        try {
            const targetPath = filePath || this.pubKeyPath
            await fs.access(targetPath)
            const publicKey = await fs.readFile(targetPath, 'utf8')
            return { publicKey, hasKey: true }
        } catch {
            return { publicKey: '', hasKey: false }
        }
    }

    async listKeys(): Promise<{ name: string; path: string }[]> {
        try {
            const files = await fs.readdir(this.sshDir)
            const pubFiles = files.filter(f => f.endsWith('.pub'))
            return pubFiles.map(f => ({
                name: f.replace('.pub', ''),
                path: path.join(this.sshDir, f)
            }))
        } catch {
            return []
        }
    }

    async generateKey(email: string): Promise<string> {
        try {
            // Create .ssh dir if not exists
            await fs.mkdir(this.sshDir, { recursive: true, mode: 0o700 })

            // Generate key without passphrase
            // -t rsa: type
            // -b 4096: bits
            // -C: comment (email)
            // -f: file
            // -N "": no passphrase
            // -q: quiet
            await execAsync(`ssh-keygen -t rsa -b 4096 -C "${email}" -f "${this.keyPath}" -N "" -q`)

            const { publicKey } = await this.getKey()
            return publicKey
        } catch (err: any) {
            console.error('Failed to generate SSH key:', err)
            throw new Error(`Failed to generate SSH key: ${err.message}`)
        }
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            // Using -T to test connection to GitHub
            // Note: This often returns exit code 1 even on success because GitHub doesn't provide shell access
            const { stderr } = await execAsync('ssh -T git@github.com -o ConnectTimeout=5 -o StrictHostKeyChecking=no').catch(err => err)

            if (stderr.includes('successfully authenticated')) {
                return { success: true, message: stderr.trim() }
            }
            return { success: false, message: stderr.trim() || 'Authentication failed' }
        } catch (err: any) {
            return { success: false, message: err.message }
        }
    }
}

export const sshService = new SshService()
