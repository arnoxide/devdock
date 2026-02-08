import fs from 'node:fs/promises'
import path from 'node:path'
import { EnvFile, EnvVariable, EnvTemplate } from '../../shared/types'
import store from '../store'

const SECRET_PATTERNS = [
  /SECRET/i, /PASSWORD/i, /TOKEN/i, /KEY/i, /API_KEY/i,
  /PRIVATE/i, /CREDENTIAL/i, /AUTH/i
]

export class EnvManager {
  async readEnvFile(projectPath: string, filePath: string): Promise<EnvFile> {
    const fullPath = path.join(projectPath, filePath)
    const content = await fs.readFile(fullPath, 'utf-8')
    const stat = await fs.stat(fullPath)

    const variables = this.parseEnvContent(content)

    return {
      projectId: '', // Set by caller
      filePath,
      variables,
      lastModified: stat.mtime.toISOString()
    }
  }

  async writeEnvFile(projectPath: string, envFile: EnvFile): Promise<void> {
    const fullPath = path.join(projectPath, envFile.filePath)
    const content = this.serializeEnv(envFile.variables)
    await fs.writeFile(fullPath, content, 'utf-8')
  }

  async listEnvFiles(projectPath: string): Promise<string[]> {
    const entries = await fs.readdir(projectPath)
    return entries.filter((e) => e.startsWith('.env'))
  }

  saveTemplate(template: EnvTemplate): void {
    const templates = store.get('envTemplates', [])
    const existing = templates.findIndex((t: EnvTemplate) => t.id === template.id)
    if (existing >= 0) {
      templates[existing] = template
    } else {
      templates.push(template)
    }
    store.set('envTemplates', templates)
  }

  listTemplates(): EnvTemplate[] {
    return store.get('envTemplates', [])
  }

  applyTemplate(template: EnvTemplate): EnvVariable[] {
    return template.variables.map((v) => ({
      ...v,
      value: ''
    }))
  }

  private parseEnvContent(content: string): EnvVariable[] {
    const variables: EnvVariable[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and pure comment lines
      if (!trimmed || trimmed.startsWith('#')) continue

      // Match KEY=VALUE with optional inline comment
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue

      const key = match[1]
      let value = match[2]

      // Handle quoted values
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      // Check for inline comment
      let comment: string | undefined
      const commentMatch = value.match(/\s+#\s*(.*)$/)
      if (commentMatch && !value.startsWith('"')) {
        comment = commentMatch[1]
        value = value.replace(commentMatch[0], '')
      }

      variables.push({
        key,
        value,
        isSecret: SECRET_PATTERNS.some((p) => p.test(key)),
        comment
      })
    }

    return variables
  }

  private serializeEnv(variables: EnvVariable[]): string {
    return variables
      .map((v) => {
        const needsQuotes = v.value.includes(' ') || v.value.includes('#')
        const val = needsQuotes ? `"${v.value}"` : v.value
        const comment = v.comment ? ` # ${v.comment}` : ''
        return `${v.key}=${val}${comment}`
      })
      .join('\n') + '\n'
  }
}

export const envManager = new EnvManager()
