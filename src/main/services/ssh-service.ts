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

// Flags shared by every ssh invocation DevDock makes on its own (no attached
// terminal). BatchMode disables all interactive prompts (passphrase, host key
// confirmation) so a locked/unknown key fails fast with a clear stderr message
// instead of ssh falling back to $SSH_ASKPASS, which usually isn't installed.
const NONINTERACTIVE_SSH_OPTS = '-o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5'

export class SshService {
    private sshDir = path.join(os.homedir(), '.ssh')

    private keyPath(name = 'id_rsa'): string {
        return path.join(this.sshDir, name)
    }

    resolveKeyPath(name: string): string {
        return this.keyPath(name)
    }

    private pubKeyPath(name = 'id_rsa'): string {
        return path.join(this.sshDir, `${name}.pub`)
    }

    async getKey(nameOrPath?: string): Promise<SshKeyInfo> {
        try {
            const targetPath = !nameOrPath
                ? this.pubKeyPath()
                : path.isAbsolute(nameOrPath)
                    ? nameOrPath
                    : this.pubKeyPath(nameOrPath)
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

    async generateKey(email: string, name = 'id_rsa'): Promise<string> {
        try {
            // Create .ssh dir if not exists
            await fs.mkdir(this.sshDir, { recursive: true, mode: 0o700 })

            const targetKeyPath = this.keyPath(name)
            if (await fs.access(targetKeyPath).then(() => true).catch(() => false)) {
                throw new Error(`A key named "${name}" already exists. Choose a different name.`)
            }

            // Generate key without passphrase
            // -t rsa: type
            // -b 4096: bits
            // -C: comment (email)
            // -f: file
            // -N "": no passphrase
            // -q: quiet
            await execAsync(`ssh-keygen -t rsa -b 4096 -C "${email}" -f "${targetKeyPath}" -N "" -q`)

            const { publicKey } = await this.getKey(name)
            return publicKey
        } catch (err: any) {
            console.error('Failed to generate SSH key:', err)
            throw new Error(`Failed to generate SSH key: ${err.message}`)
        }
    }

    async deleteKey(name: string): Promise<void> {
        if (name === 'id_rsa') throw new Error('The default id_rsa key cannot be deleted from here.')
        await fs.rm(this.keyPath(name), { force: true })
        await fs.rm(this.pubKeyPath(name), { force: true })
    }

    async testConnection(name?: string): Promise<{ success: boolean; message: string }> {
        try {
            const identityFlag = name ? `-i "${this.keyPath(name)}" -o IdentitiesOnly=yes` : ''
            // Using -T to test connection to GitHub
            // Note: This often returns exit code 1 even on success because GitHub doesn't provide shell access
            const { stderr } = await execAsync(
                `ssh -T git@github.com ${identityFlag} ${NONINTERACTIVE_SSH_OPTS}`
            ).catch(err => err)

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
