import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { GitStatus, GitFileStatus } from '../../shared/types'

const execAsync = promisify(exec)

export class GitService {
    async isRepo(projectPath: string): Promise<boolean> {
        try {
            await execAsync('git rev-parse --is-inside-work-tree', { cwd: projectPath })
            return true
        } catch {
            return false
        }
    }

    async getStatus(projectPath: string): Promise<GitStatus> {
        const isRepo = await this.isRepo(projectPath)
        if (!isRepo) {
            return {
                isRepo: false,
                branch: '',
                behind: 0,
                ahead: 0,
                staged: [],
                unstaged: [],
                untracked: []
            }
        }

        try {
            // Get branch name
            const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath })

            // Get status short form
            const { stdout: statusOut } = await execAsync('git status --porcelain', { cwd: projectPath })

            // Get ahead/behind
            let ahead = 0
            let behind = 0
            try {
                await execAsync('git fetch', { cwd: projectPath })
                const { stdout: abOut } = await execAsync('git rev-list --left-right --count HEAD...@{u}', { cwd: projectPath })
                const [a, b] = abOut.trim().split('\t').map(Number)
                ahead = a || 0
                behind = b || 0
            } catch {
                // No upstream or fetch failed
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
                    status: 'modified' // default fallback
                }

                if (x === '?' && y === '?') {
                    fileStatus.status = 'untracked'
                    untracked.push(fileStatus)
                } else {
                    // Staged changes (X)
                    if (x !== ' ' && x !== '?') {
                        const stagedFile = { ...fileStatus, status: this.mapStatus(x) }
                        staged.push(stagedFile)
                    }
                    // Unstaged changes (Y)
                    if (y !== ' ' && y !== '?') {
                        const unstagedFile = { ...fileStatus, status: this.mapStatus(y) }
                        unstaged.push(unstagedFile)
                    }
                }
            }

            // Last commit
            let lastCommit
            try {
                const { stdout: logOut } = await execAsync('git log -1 --format="%H|%s|%an|%ai"', { cwd: projectPath })
                const [hash, message, author, date] = logOut.trim().split('|')
                lastCommit = { hash, message, author, date }
            } catch {
                // No commits yet
            }

            return {
                isRepo: true,
                branch: branch.trim(),
                ahead,
                behind,
                staged,
                unstaged,
                untracked,
                lastCommit
            }
        } catch (err) {
            console.error('Git status error:', err)
            throw err
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
        // Stage all changes (modified, deleted, and untracked files) before committing
        await execAsync('git add -A', { cwd: projectPath })
        await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: projectPath })
    }

    async push(projectPath: string): Promise<void> {
        // Check if upstream is set; if not, push with -u to set it
        try {
            await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: projectPath })
            await execAsync('git push', { cwd: projectPath })
        } catch {
            const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: projectPath })
            await execAsync(`git push -u origin ${branch.trim()}`, { cwd: projectPath })
        }
    }

    async pull(projectPath: string): Promise<void> {
        // Check if upstream is set before pulling
        try {
            await execAsync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { cwd: projectPath })
            await execAsync('git pull', { cwd: projectPath })
        } catch {
            throw new Error('No upstream branch configured. Push first to set up tracking.')
        }
    }

    async init(projectPath: string): Promise<void> {
        await execAsync('git init', { cwd: projectPath })
    }

    async add(projectPath: string, files: string[]): Promise<void> {
        const fileList = files.map(f => `"${f}"`).join(' ')
        await execAsync(`git add ${fileList}`, { cwd: projectPath })
    }
}

export const gitService = new GitService()
