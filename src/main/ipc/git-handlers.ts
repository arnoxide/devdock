import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { gitService } from '../services/git-service'
import { githubService } from '../services/github-service'
import { sshService } from '../services/ssh-service'
import store from '../store'
import { ProjectConfig } from '../../shared/types'

function getProjectPath(projectId: string): string {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find(p => p.id === projectId)
    if (!project) throw new Error('Project not found')
    return project.path
}

export function registerGitHandlers(): void {
    ipcMain.handle(IPC.GIT_STATUS, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.getStatus(projectPath)
    })

    ipcMain.handle(IPC.GIT_COMMIT, async (_event, { projectId, message }: { projectId: string, message: string }) => {
        const projectPath = getProjectPath(projectId)
        return gitService.commit(projectPath, message)
    })

    ipcMain.handle(IPC.GIT_PUSH, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        const result = await gitService.push(projectPath)
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

    ipcMain.handle(IPC.GIT_PULL, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.pull(projectPath)
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
        await gitService.pull(projectPath)
        await gitService.push(projectPath)
    })

    // SSH Handlers
    ipcMain.handle(IPC.SSH_GET_KEY, async () => {
        return sshService.getKey()
    })

    ipcMain.handle(IPC.SSH_GENERATE_KEY, async (_event, email: string) => {
        return sshService.generateKey(email)
    })

    ipcMain.handle(IPC.SSH_TEST_CONNECTION, async () => {
        return sshService.testConnection()
    })

    ipcMain.handle(IPC.SSH_LIST_KEYS, async () => {
        return sshService.listKeys()
    })
}
