import fs from 'node:fs/promises'
import path from 'node:path'
import { ProjectType } from '../../shared/types'

export interface DetectionResult {
  type: ProjectType
  scripts: Record<string, string>
  startCommand: string
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null
  envFiles: string[]
}

const ENV_FILE_NAMES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.example',
  '.env.test'
]

export class ProjectDetector {
  async detect(projectPath: string): Promise<DetectionResult> {
    const entries = await fs.readdir(projectPath)
    const hasFile = (name: string): boolean => entries.includes(name)

    // 1. Check Next.js
    if (this.hasConfigFile(entries, 'next.config')) {
      return this.buildNodeResult(projectPath, 'nextjs')
    }

    // 2. Check Vite
    if (this.hasConfigFile(entries, 'vite.config')) {
      return this.buildNodeResult(projectPath, 'vite')
    }

    // 3. Check package.json (generic Node/React)
    if (hasFile('package.json')) {
      const pkg = await this.readPackageJson(projectPath)
      if (this.isExpo(pkg)) {
        return this.buildNodeResult(projectPath, 'expo')
      }
      if (this.isReactNative(pkg)) {
        return this.buildNodeResult(projectPath, 'react-native')
      }
      if (this.isCRA(pkg)) {
        return this.buildNodeResult(projectPath, 'react-cra')
      }
      return this.buildNodeResult(projectPath, 'nodejs')
    }

    // 4. Check Python
    if (hasFile('requirements.txt') || hasFile('Pipfile') || hasFile('pyproject.toml')) {
      return this.detectPythonType(projectPath, entries)
    }

    // 5. Check Rust
    if (hasFile('Cargo.toml')) {
      return {
        type: 'rust',
        scripts: {},
        startCommand: 'cargo run',
        packageManager: null,
        envFiles: await this.findEnvFiles(projectPath)
      }
    }

    // 6. Check Go
    if (hasFile('go.mod')) {
      return {
        type: 'go',
        scripts: {},
        startCommand: 'go run .',
        packageManager: null,
        envFiles: await this.findEnvFiles(projectPath)
      }
    }

    return {
      type: 'unknown',
      scripts: {},
      startCommand: '',
      packageManager: null,
      envFiles: await this.findEnvFiles(projectPath)
    }
  }

  private hasConfigFile(entries: string[], baseName: string): boolean {
    return entries.some(
      (e) =>
        e.startsWith(baseName + '.') &&
        (e.endsWith('.js') || e.endsWith('.ts') || e.endsWith('.mjs') || e.endsWith('.cjs'))
    )
  }

  private async detectPackageManager(
    projectPath: string
  ): Promise<'npm' | 'yarn' | 'pnpm' | 'bun'> {
    const entries = await fs.readdir(projectPath)
    if (entries.includes('pnpm-lock.yaml')) return 'pnpm'
    if (entries.includes('yarn.lock')) return 'yarn'
    if (entries.includes('bun.lockb') || entries.includes('bun.lock')) return 'bun'
    return 'npm'
  }

  private async readPackageJson(
    projectPath: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const content = await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  private isExpo(pkg: Record<string, unknown> | null): boolean {
    if (!pkg) return false
    const deps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {})
    }
    return 'expo' in deps
  }

  private isReactNative(pkg: Record<string, unknown> | null): boolean {
    if (!pkg) return false
    const deps = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {})
    }
    return 'react-native' in deps && !('expo' in deps)
  }

  private isCRA(pkg: Record<string, unknown> | null): boolean {
    if (!pkg) return false
    const scripts = pkg.scripts as Record<string, string> | undefined
    if (!scripts) return false
    return Object.values(scripts).some((s) => s.includes('react-scripts'))
  }

  private async buildNodeResult(
    projectPath: string,
    type: ProjectType
  ): Promise<DetectionResult> {
    const pm = await this.detectPackageManager(projectPath)
    const pkg = await this.readPackageJson(projectPath)
    const scripts = (pkg?.scripts as Record<string, string>) ?? {}

    let startCommand = ''
    if (type === 'expo') {
      startCommand = `${pm === 'npm' ? 'npx' : pm} expo start`
    } else if (type === 'react-native' && scripts.android) {
      startCommand = `${pm} run android`
    } else if (scripts.dev) {
      startCommand = `${pm} run dev`
    } else if (scripts.start) {
      startCommand = pm === 'npm' ? 'npm run start' : `${pm} start`
    }

    return {
      type,
      scripts,
      startCommand,
      packageManager: pm,
      envFiles: await this.findEnvFiles(projectPath)
    }
  }

  private async detectPythonType(
    projectPath: string,
    entries: string[]
  ): Promise<DetectionResult> {
    const envFiles = await this.findEnvFiles(projectPath)

    if (entries.includes('manage.py')) {
      return {
        type: 'python-django',
        scripts: {},
        startCommand: 'python manage.py runserver',
        packageManager: null,
        envFiles
      }
    }

    // Check pyproject.toml for framework hints
    if (entries.includes('pyproject.toml')) {
      try {
        const content = await fs.readFile(path.join(projectPath, 'pyproject.toml'), 'utf-8')
        if (content.includes('fastapi')) {
          return {
            type: 'python-fastapi',
            scripts: {},
            startCommand: 'uvicorn main:app --reload',
            packageManager: null,
            envFiles
          }
        }
        if (content.includes('flask')) {
          return {
            type: 'python-flask',
            scripts: {},
            startCommand: 'flask run --reload',
            packageManager: null,
            envFiles
          }
        }
      } catch {
        // ignore
      }
    }

    if (entries.includes('app.py') || entries.includes('wsgi.py')) {
      return {
        type: 'python-flask',
        scripts: {},
        startCommand: 'flask run --reload',
        packageManager: null,
        envFiles
      }
    }

    return {
      type: 'python',
      scripts: {},
      startCommand: 'python main.py',
      packageManager: null,
      envFiles
    }
  }

  private async findEnvFiles(projectPath: string): Promise<string[]> {
    const found: string[] = []
    for (const name of ENV_FILE_NAMES) {
      try {
        await fs.access(path.join(projectPath, name))
        found.push(name)
      } catch {
        // file doesn't exist
      }
    }
    return found
  }
}

export const projectDetector = new ProjectDetector()
