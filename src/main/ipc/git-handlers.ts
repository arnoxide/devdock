import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { gitService } from '../services/git-service'
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
        return gitService.push(projectPath)
    })

    ipcMain.handle(IPC.GIT_PULL, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.pull(projectPath)
    })

    ipcMain.handle(IPC.GIT_INIT, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        return gitService.init(projectPath)
    })

    ipcMain.handle(IPC.GIT_SYNC, async (_event, projectId: string) => {
        const projectPath = getProjectPath(projectId)
        await gitService.pull(projectPath)
        await gitService.push(projectPath)
    })
}
