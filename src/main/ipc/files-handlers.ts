import { ipcMain, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import { IPC } from '../../shared/ipc-channels'

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'out', '.cache', '__pycache__', '.venv', 'venv', '.DS_Store'])

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  ext?: string
  children?: FileEntry[]
}

function readDir(dirPath: string, depth = 0): FileEntry[] {
  if (depth > 4) return []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries
      .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })
      .map((e) => {
        const fullPath = path.join(dirPath, e.name)
        if (e.isDirectory()) {
          return { name: e.name, path: fullPath, type: 'directory' as const }
        }
        const stat = fs.statSync(fullPath)
        return {
          name: e.name,
          path: fullPath,
          type: 'file' as const,
          size: stat.size,
          ext: path.extname(e.name).slice(1).toLowerCase()
        }
      })
  } catch {
    return []
  }
}

export function registerFilesHandlers(): void {
  ipcMain.handle(IPC.FILES_LIST, (_e, dirPath: string) => {
    return readDir(dirPath)
  })

  ipcMain.handle(IPC.FILES_OPEN, (_e, filePath: string) => {
    shell.openPath(filePath)
  })
}
