import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { GitStatus, GitFileStatus } from '../../shared/types'

const execAsync = promisify(exec)

const MAX_BUFFER = 10 * 1024 * 1024 // 10MB

export class GitService {
    async isRepo(projectPath: string): Promise<boolean> {
        try {
            // Check if git is available and if we're in a work tree
            const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd: projectPath, maxBuffer: MAX_BUFFER })
            return stdout.trim() === 'true'
        } catch {
            // Fallback: check if .git directory exists
            try {
                const fs = await import('node:fs/promises')
                const stats = await fs.stat(path.join(projectPath, '.git'))
                return stats.isDirectory()
            } catch {
                return false
            }
        }
    }

    async getStatus(projectPath: string): Promise<GitStatus> {
        const isRepo = await this.isRepo(projectPath)
        if (!isRepo) {
            return {
                isRepo: false,
                branch: '',
                hasRemote: false,
                behind: 0,
                ahead: 0,
                staged: [],
                unstaged: [],
                untracked: []
            }
        }

        try {
            // Get branch name - more robust way
            let branch = ''
            try {
                const { stdout: bOut } = await execAsync('git branch --show-current', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                branch = bOut.trim()

                if (!branch) {
                    const { stdout: headOut } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                    branch = headOut.trim()
                }
            } catch {
                branch = 'HEAD (no commits)'
            }

            // Check if a remote origin exists (even without upstream tracking)
            let hasRemote = false
            let hasUpstream = false
            try {
                await execAsync('git remote get-url origin', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                hasRemote = true
            } catch {
                hasRemote = false
            }

            // Check if the current branch tracks an upstream
            if (hasRemote && branch && branch !== 'HEAD (no commits)') {
                try {
                    await execAsync(`git rev-parse --abbrev-ref ${branch}@{u}`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
                    hasUpstream = true
                } catch {
                    hasUpstream = false
                }
            }

            // Get status short form
            let statusOut = ''
            try {
                const { stdout } = await execAsync('git status --porcelain', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                statusOut = stdout
            } catch (err) {
                console.warn('Git porcelain status failed:', err)
            }

            // Get ahead/behind
            let ahead = 0
            let behind = 0
            try {
                if (hasUpstream) {
                    // Try fetch but don't fail if no remote exists
                    try {
                        await execAsync('git fetch --timeout=5', { cwd: projectPath, maxBuffer: MAX_BUFFER }).catch(() => { })
                    } catch { }

                    const { stdout: abOut } = await execAsync('git rev-list --left-right --count HEAD...@{u}', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                    const [a, b] = abOut.trim().split(/\s+/).map(Number)
                    ahead = a || 0
                    behind = b || 0
                }
            } catch {
                // No upstream or fetch failed - common for new/local-only repos
            }

            const staged: GitFileStatus[] = []
            const unstaged: GitFileStatus[] = []
            const untracked: GitFileStatus[] = []

            const lines = statusOut.split('\n').filter(Boolean)
            for (const line of lines) {
                const x = line[0]
                const y = line[1]
                const filePath = line.slice(3)

                const fileStatus: GitFileStatus = {
                    path: filePath,
                    status: 'modified'
                }

                if (x === '?' && y === '?') {
                    fileStatus.status = 'untracked'
                    untracked.push(fileStatus)
                } else {
                    if (x !== ' ' && x !== '?') {
                        staged.push({ ...fileStatus, status: this.mapStatus(x) })
                    }
                    if (y !== ' ' && y !== '?') {
                        unstaged.push({ ...fileStatus, status: this.mapStatus(y) })
                    }
                }
            }

            let lastCommit
            try {
                const { stdout: logOut } = await execAsync('git log -1 --format="%H|%s|%an|%ai"', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                const parts = logOut.trim().split('|')
                if (parts.length >= 4) {
                    const [hash, message, author, date] = parts
                    lastCommit = { hash, message, author, date }
                }
            } catch {
                // No commits yet
            }

            return {
                isRepo: true,
                branch: branch || 'master',
                hasRemote,
                ahead,
                behind,
                staged,
                unstaged,
                untracked,
                lastCommit
            }
        } catch (err: any) {
            console.error('Git status parsing error:', err)
            // Still return isRepo: true if we got this far
            return {
                isRepo: true,
                branch: 'unknown',
                hasRemote: false,
                ahead: 0,
                behind: 0,
                staged: [],
                unstaged: [],
                untracked: []
            }
        }
    }

    private mapStatus(char: string): GitFileStatus['status'] {
        switch (char) {
            case 'M': return 'modified'
            case 'A': return 'added'
            case 'D': return 'deleted'
            case 'R': return 'renamed'
            case '?': return 'untracked'
            default: return 'modified'
        }
    }

    async commit(projectPath: string, message: string): Promise<void> {
        // Ensure .gitignore exists for node projects to prevent massive commits
        await this.ensureGitignore(projectPath)

        // Stage all changes
        await execAsync('git add -A', { cwd: projectPath, maxBuffer: MAX_BUFFER })
        await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
    }

    async push(projectPath: string): Promise<void> {
        // Check if upstream is set; if not, push with -u to set it
        try {
            await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: projectPath, maxBuffer: MAX_BUFFER })
            await execAsync('git push', { cwd: projectPath, maxBuffer: MAX_BUFFER })
        } catch {
            const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath, maxBuffer: MAX_BUFFER })
            await execAsync(`git push -u origin ${branch.trim()}`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
        }
    }

    async pull(projectPath: string): Promise<void> {
        // Check if upstream is set before pulling
        try {
            await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: projectPath, maxBuffer: MAX_BUFFER })
            await execAsync('git pull', { cwd: projectPath, maxBuffer: MAX_BUFFER })
        } catch {
            throw new Error('No upstream branch configured. Push first to set up tracking.')
        }
    }

    async init(projectPath: string): Promise<void> {
        await execAsync('git init', { cwd: projectPath, maxBuffer: MAX_BUFFER })
        await this.ensureGitignore(projectPath)
    }

    async add(projectPath: string, files: string[]): Promise<void> {
        const fileList = files.map(f => `"${f}"`).join(' ')
        await execAsync(`git add ${fileList}`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
    }

    private async ensureGitignore(projectPath: string): Promise<void> {
        try {
            const fs = await import('node:fs/promises')
            const gitignorePath = path.join(projectPath, '.gitignore')

            try {
                await fs.access(gitignorePath)
            } catch {
                // File does not exist, create a basic one for web development
                const content = [
                    'node_modules/',
                    'dist/',
                    '.env*',
                    '.DS_Store',
                    '*.log',
                    '.vite/',
                    '.next/'
                ].join('\n')
                await fs.writeFile(gitignorePath, content)
            }
        } catch (err) {
            console.warn('Failed to ensure .gitignore:', err)
        }
    }
    async setRemote(projectPath: string, url: string): Promise<void> {
        try {
            // Check if origin already exists
            try {
                await execAsync('git remote get-url origin', { cwd: projectPath, maxBuffer: MAX_BUFFER })
                // If it exists, change it
                await execAsync(`git remote set-url origin "${url}"`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
            } catch {
                // If it doesn't exist, add it
                await execAsync(`git remote add origin "${url}"`, { cwd: projectPath, maxBuffer: MAX_BUFFER })
            }
        } catch (err: any) {
            console.error('Failed to set remote:', err)
            throw new Error(`Failed to set remote: ${err.message}`)
        }
    }

    async getRemote(projectPath: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync('git remote get-url origin', { cwd: projectPath, maxBuffer: MAX_BUFFER })
            return stdout.trim()
        } catch {
            return null
        }
    }
}

export const gitService = new GitService()
