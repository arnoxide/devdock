import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { gitService, GitIdentity } from '../services/git-service'
import { githubService } from '../services/github-service'
import { sshService } from '../services/ssh-service'
import store from '../store'
import { GitCreatePullRequestRequest, ProjectConfig } from '../../shared/types'

function getProject(projectId: string): ProjectConfig {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find(p => p.id === projectId)
    if (!project) throw new Error('Project not found')
    return project
}

function getProjectPath(projectId: string): string {
    return getProject(projectId).path
}

// A project can pin itself to a specific GitHub account (for HTTPS push/pull/PR)
// and/or a specific SSH key (for SSH push/pull), so pushing/pulling many repos
// tied to different accounts doesn't require manually "switching" the active
// account each time. Falls back to the globally active account when unset.
function resolveGitIdentity(projectId: string): GitIdentity {
    const project = getProject(projectId)
    const identity = project.gitIdentity

    const token = identity?.githubUsername
        ? githubService.getAccounts().find(a => a.username === identity.githubUsername)?.token
        : githubService.getCredentials()?.token

    const sshKeyPath = identity?.sshKeyName
        ? sshService.resolveKeyPath(identity.sshKeyName)
        : undefined

    return { token, sshKeyPath }
}

function parseGitHubRemote(remoteUrl: string | null): { owner: string; repo: string } {
    if (!remoteUrl) throw new Error('Set a GitHub remote before creating a pull request.')

    const normalized = remoteUrl.trim().replace(/\.git$/, '')
    const httpsMatch = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/i)
    if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }

    const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+)$/i)
    if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] }

    const sshUrlMatch = normalized.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/]+)$/i)
    if (sshUrlMatch) return { owner: sshUrlMatch[1], repo: sshUrlMatch[2] }

    throw new Error('Pull requests can only be created for GitHub remotes.')
}

export function registerGitHandlers(): void {
    ipcMain.handle(IPC.GIT_STATUS, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.getStatus(projectPath, resolveGitIdentity(projectId))
    })

    ipcMain.handle(IPC.GIT_COMMIT, async (_event, { projectId, message }: { projectId: string, message: string }) => {
        const projectPath = getProjectPath(projectId)
        return gitService.commit(projectPath, message)
    })

    ipcMain.handle(IPC.GIT_PUSH, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        const result = await gitService.push(projectPath, resolveGitIdentity(projectId))
        // After push, trigger GitHub Actions refresh with a delay
        // (GitHub needs a moment to register the push and start workflows)
        setTimeout(() => {
            githubService.refreshNow()
            // Poll again after 15s to catch workflow status changes
            setTimeout(() => githubService.refreshNow(), 15000)
        }, 5000)
        githubService.startFastPolling()
        return result
    })

    ipcMain.handle(IPC.GIT_PULL, async (_event, projectId: string, options?: { rebase?: boolean }) => {
        const projectPath = getProjectPath(projectId)
        return gitService.pull(projectPath, options, resolveGitIdentity(projectId))
    })

    ipcMain.handle(IPC.GIT_INIT, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.init(projectPath)
    })

    ipcMain.handle(IPC.GIT_GET_REMOTE, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.getRemote(projectPath)
    })

    ipcMain.handle(IPC.GIT_SET_REMOTE, async (_event, { projectId, url }: { projectId: string, url: string }) => {
        const projectPath = getProjectPath(projectId)
        return gitService.setRemote(projectPath, url)
    })

    ipcMain.handle(IPC.GIT_SYNC, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.sync(projectPath, resolveGitIdentity(projectId))
    })

    ipcMain.handle(IPC.GIT_CREATE_PR, async (_event, request: GitCreatePullRequestRequest) => {
        const projectPath = getProjectPath(request.projectId)
        const remote = await gitService.getRemote(projectPath)
        const branch = await gitService.getCurrentBranch(projectPath)
        const repo = parseGitHubRemote(remote)

        return githubService.createPullRequest({
            owner: repo.owner,
            repo: repo.repo,
            title: request.title,
            body: request.body,
            head: branch,
            base: request.base,
            draft: request.draft,
            tokenOverride: resolveGitIdentity(request.projectId).token
        })
    })

    // SSH Handlers
    ipcMain.handle(IPC.SSH_GET_KEY, async (_event, name?: string) => {
        return sshService.getKey(name)
    })

    ipcMain.handle(IPC.SSH_GENERATE_KEY, async (_event, email: string, name?: string) => {
        return sshService.generateKey(email, name)
    })

    ipcMain.handle(IPC.SSH_TEST_CONNECTION, async (_event, name?: string) => {
        return sshService.testConnection(name)
    })

    ipcMain.handle(IPC.SSH_LIST_KEYS, async () => {
        return sshService.listKeys()
    })

    ipcMain.handle(IPC.SSH_DELETE_KEY, async (_event, name: string) => {
        return sshService.deleteKey(name)
    })
}
