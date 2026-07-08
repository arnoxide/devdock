import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { GitStatus, GitFileStatus, GitOperationResult } from '../../shared/types'
import { githubService } from './github-service'

const execAsync = promisify(exec)

const MAX_BUFFER = 10 * 1024 * 1024 // 10MB
// BatchMode disables all interactive ssh prompts (passphrase, host key
// confirmation) so a locked/unregistered key fails fast with clear stderr
// instead of falling back to $SSH_ASKPASS, which usually isn't installed.
const NONINTERACTIVE_SSH_COMMAND = 'ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10'
const GIT_ENV = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never',
    GIT_ASKPASS: 'echo',
    SSH_ASKPASS: 'echo',
    GIT_SSH_COMMAND: NONINTERACTIVE_SSH_COMMAND
}

export interface GitIdentity {
    token?: string
    sshKeyPath?: string
}

export class GitService {
    private async runGit(projectPath: string, command: string, timeout = 30000, env?: NodeJS.ProcessEnv) {
        return execAsync(command, {
            cwd: projectPath,
            maxBuffer: MAX_BUFFER,
            timeout,
            env: env || GIT_ENV
        })
    }

    private isGitHubHttpsRemote(remoteUrl: string | null): boolean {
        return Boolean(remoteUrl && /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/i.test(remoteUrl.trim()))
    }

    private isGitHubSshRemote(remoteUrl: string | null): boolean {
        return Boolean(remoteUrl && /^(git@github\.com:|ssh:\/\/git@github\.com\/)/i.test(remoteUrl.trim()))
    }

    private getGitHubTokenEnv(remoteUrl: string | null, identity?: GitIdentity): NodeJS.ProcessEnv {
        const isHttps = this.isGitHubHttpsRemote(remoteUrl)
        const token = isHttps ? (identity?.token ?? githubService.getCredentials()?.token) : undefined
        const sshKeyPath = this.isGitHubSshRemote(remoteUrl) ? identity?.sshKeyPath : undefined

        let env = GIT_ENV
        if (sshKeyPath) {
            env = {
                ...env,
                GIT_SSH_COMMAND: `${NONINTERACTIVE_SSH_COMMAND} -i "${sshKeyPath}" -o IdentitiesOnly=yes`
            }
        }

        if (!token) return env

        return {
            ...env,
            GIT_CONFIG_COUNT: '1',
            GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
            GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`
        }
    }

    private async getNetworkGitEnv(projectPath: string, identity?: GitIdentity): Promise<NodeJS.ProcessEnv> {
        const remoteUrl = await this.getRemote(projectPath)
        return this.getGitHubTokenEnv(remoteUrl, identity)
    }

    private gitError(err: any, fallback: string): Error {
        const message = String(err?.stderr || err?.stdout || err?.message || fallback).trim()

        if (
            message.includes('could not read Username') ||
            message.includes('terminal prompts disabled') ||
            message.includes('Authentication failed') ||
            message.includes('GCM_INTERACTIVE') ||
            message.includes('could not read Password')
        ) {
            return new Error('GIT_AUTH_REQUIRED')
        }

        return new Error(message || fallback)
    }

    private formatGitResult(title: string, stdout = '', stderr = ''): GitOperationResult {
        const output = [stdout, stderr]
            .map(text => text.trim())
            .filter(Boolean)
            .join('\n')
            .trim()

        if (output.includes('Already up to date.')) {
            return {
                title: 'Already up to date',
                output
            }
        }

        const changedLine = output
            .split('\n')
            .map(line => line.trim())
            .find(line => /\d+\s+files?\s+changed/.test(line))

        return {
            title: changedLine || title,
            output: output || title
        }
    }

    async isRepo(projectPath: string): Promise<boolean> {
        try {
            // Check if git is available and if we're in a work tree
            const { stdout } = await this.runGit(projectPath, 'git rev-parse --is-inside-work-tree')
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

    async getStatus(projectPath: string, identity?: GitIdentity): Promise<GitStatus> {
        const isRepo = await this.isRepo(projectPath)
        if (!isRepo) {
            return {
                isRepo: false,
                branch: '',
                hasRemote: false,
                hasUpstream: false,
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
                const { stdout: bOut } = await this.runGit(projectPath, 'git branch --show-current')
                branch = bOut.trim()

                if (!branch) {
                    const { stdout: headOut } = await this.runGit(projectPath, 'git rev-parse --abbrev-ref HEAD')
                    branch = headOut.trim()
                }
            } catch {
                branch = 'HEAD (no commits)'
            }

            // Check if a remote origin exists (even without upstream tracking)
            let hasRemote = false
            let hasUpstream = false
            try {
                await this.runGit(projectPath, 'git remote get-url origin')
                hasRemote = true
            } catch {
                hasRemote = false
            }

            // Check if the current branch tracks an upstream
            let upstreamBranch = ''
            if (hasRemote && branch && branch !== 'HEAD (no commits)') {
                try {
                    const { stdout: upstreamOut } = await this.runGit(projectPath, 'git rev-parse --abbrev-ref --symbolic-full-name @{u}')
                    upstreamBranch = upstreamOut.trim()
                    hasUpstream = true
                } catch {
                    hasUpstream = false
                }
            }

            // Get status short form
            let statusOut = ''
            try {
                const { stdout } = await this.runGit(projectPath, 'git status --porcelain')
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
                        const env = await this.getNetworkGitEnv(projectPath, identity)
                        await this.runGit(projectPath, 'git fetch', 5000, env).catch(() => { })
                    } catch { }

                    const { stdout: abOut } = await this.runGit(projectPath, 'git rev-list --left-right --count HEAD...@{u}')
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
                const { stdout: logOut } = await this.runGit(projectPath, 'git log -1 --format="%H|%s|%an|%ai"')
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
                hasUpstream,
                upstreamBranch: upstreamBranch || undefined,
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
                hasUpstream: false,
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
        await this.runGit(projectPath, 'git add -A')
        await this.runGit(projectPath, `git commit -m "${message.replace(/"/g, '\\"')}"`)
    }

    async push(projectPath: string, identity?: GitIdentity): Promise<void> {
        // Check if upstream is set; if not, push with -u to set it.
        let hasUpstream = false
        try {
            await this.runGit(projectPath, 'git rev-parse --abbrev-ref --symbolic-full-name @{u}')
            hasUpstream = true
        } catch {
            hasUpstream = false
        }

        if (hasUpstream) {
            try {
                const env = await this.getNetworkGitEnv(projectPath, identity)
                await this.runGit(projectPath, 'git push', 30000, env)
            } catch (err: any) {
                throw this.gitError(err, 'Git push failed.')
            }
            return
        }

        const { stdout: branch } = await this.runGit(projectPath, 'git rev-parse --abbrev-ref HEAD')
        try {
            const env = await this.getNetworkGitEnv(projectPath, identity)
            await this.runGit(projectPath, `git push -u origin ${branch.trim()}`, 30000, env)
        } catch (err: any) {
            throw this.gitError(err, 'Git push failed.')
        }
    }

    async pull(projectPath: string, options: { rebase?: boolean } = {}, identity?: GitIdentity): Promise<GitOperationResult> {
        // Check if upstream is set before pulling
        try {
            await this.runGit(projectPath, 'git rev-parse --abbrev-ref --symbolic-full-name @{u}')
        } catch (err: any) {
            throw new Error('NO_UPSTREAM_BRANCH')
        }

        try {
            const env = await this.getNetworkGitEnv(projectPath, identity)
            const command = options.rebase ? 'git pull --rebase' : 'git pull --no-rebase'
            const { stdout, stderr } = await this.runGit(projectPath, command, 30000, env)
            return this.formatGitResult(options.rebase ? 'Rebased onto remote changes' : 'Pulled latest changes', stdout, stderr)
        } catch (err: any) {
            throw this.gitError(err, 'Git pull failed.')
        }
    }

    async sync(projectPath: string, identity?: GitIdentity): Promise<GitOperationResult> {
        try {
            const pullResult = await this.pull(projectPath, {}, identity)
            await this.push(projectPath, identity)
            return {
                title: 'Sync complete',
                output: pullResult.output
            }
        } catch (err: any) {
            if (err?.message === 'NO_UPSTREAM_BRANCH') {
                throw new Error('NO_UPSTREAM_BRANCH')
            }
            throw err
        }
    }

    async init(projectPath: string): Promise<void> {
        await this.runGit(projectPath, 'git init')
        await this.ensureGitignore(projectPath)
    }

    async add(projectPath: string, files: string[]): Promise<void> {
        const fileList = files.map(f => `"${f}"`).join(' ')
        await this.runGit(projectPath, `git add ${fileList}`)
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
                await this.runGit(projectPath, 'git remote get-url origin')
                // If it exists, change it
                await this.runGit(projectPath, `git remote set-url origin "${url}"`)
            } catch {
                // If it doesn't exist, add it
                await this.runGit(projectPath, `git remote add origin "${url}"`)
            }
        } catch (err: any) {
            console.error('Failed to set remote:', err)
            throw new Error(`Failed to set remote: ${err.message}`)
        }
    }

    async getRemote(projectPath: string): Promise<string | null> {
        try {
            const { stdout } = await this.runGit(projectPath, 'git remote get-url origin')
            return stdout.trim()
        } catch {
            return null
        }
    }

    async getCurrentBranch(projectPath: string): Promise<string> {
        const { stdout } = await this.runGit(projectPath, 'git branch --show-current')
        const branch = stdout.trim()
        if (!branch) throw new Error('Create a branch before opening a pull request.')
        return branch
    }
}

export const gitService = new GitService()
