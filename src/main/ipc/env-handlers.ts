import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { EnvFile, EnvTemplate, ProjectConfig } from '../../shared/types'
import { envManager } from '../services/env-manager'
import store from '../store'

export function registerEnvHandlers(): void {
  ipcMain.handle(
    IPC.ENV_READ_FILE,
    async (_event, projectId: string, filePath: string) => {
      const projects = store.get('projects', []) as ProjectConfig[]
      const project = projects.find((p) => p.id === projectId)
      if (!project) throw new Error('Project not found')

      const envFile = await envManager.readEnvFile(project.path, filePath)
      envFile.projectId = projectId
      return envFile
    }
  )

  ipcMain.handle(IPC.ENV_WRITE_FILE, async (_event, envFile: EnvFile) => {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find((p) => p.id === envFile.projectId)
    if (!project) throw new Error('Project not found')

    await envManager.writeEnvFile(project.path, envFile)
  })

  ipcMain.handle(IPC.ENV_LIST_FILES, async (_event, projectId: string) => {
    const projects = store.get('projects', []) as ProjectConfig[]
    const project = projects.find((p) => p.id === projectId)
    if (!project) throw new Error('Project not found')

    return envManager.listEnvFiles(project.path)
  })

  ipcMain.handle(IPC.ENV_SAVE_TEMPLATE, async (_event, template: EnvTemplate) => {
    envManager.saveTemplate(template)
  })

  ipcMain.handle(IPC.ENV_LIST_TEMPLATES, async () => {
    return envManager.listTemplates()
  })

  ipcMain.handle(
    IPC.ENV_APPLY_TEMPLATE,
    async (_event, templateId: string, _projectId: string) => {
      const templates = envManager.listTemplates()
      const template = templates.find((t) => t.id === templateId)
      if (!template) throw new Error('Template not found')

      return envManager.applyTemplate(template)
    }
  )
}
