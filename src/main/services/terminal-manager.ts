import { v4 as uuid } from 'uuid'
import { TerminalSession } from '../../shared/types'

// Lazy-load node-pty so the app starts even if the native module isn't built
let _pty: typeof import('node-pty') | null = null
function getPty(): typeof import('node-pty') {
  if (!_pty) {
    try {
      _pty = require('node-pty')
    } catch {
      throw new Error(
        'node-pty is not available. Run "npx electron-rebuild -f -w node-pty" to build it for your platform.'
      )
    }
  }
  return _pty
}

interface ManagedTerminal {
  ptyProcess: any
  session: TerminalSession
  scrollback: string
}

const MAX_SCROLLBACK_BYTES = 150_000

export class TerminalManager {
  private terminals = new Map<string, ManagedTerminal>()
  private projectToSession = new Map<string, string>()
  private onDataCallback: ((sessionId: string, data: string) => void) | null = null
  private onExitCallback: ((sessionId: string, exitCode: number) => void) | null = null

  onData(callback: (sessionId: string, data: string) => void): void {
    this.onDataCallback = callback
  }

  onExit(callback: (sessionId: string, exitCode: number) => void): void {
    this.onExitCallback = callback
  }

  create(projectId: string, cwd: string, shell?: string): TerminalSession {
    const sessionId = uuid()
    const shellPath = shell || process.env.SHELL || '/bin/bash'

    const ptyProcess = getPty().spawn(shellPath, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as Record<string, string>
    })

    const session: TerminalSession = {
      id: sessionId,
      projectId,
      title: `Terminal - ${cwd.split('/').pop()}`,
      cwd,
      isActive: true,
      createdAt: new Date().toISOString()
    }

    const managed: ManagedTerminal = { ptyProcess, session, scrollback: '' }

    ptyProcess.onData((data) => {
      managed.scrollback += data
      if (managed.scrollback.length > MAX_SCROLLBACK_BYTES) {
        managed.scrollback = managed.scrollback.slice(-MAX_SCROLLBACK_BYTES)
      }
      this.onDataCallback?.(sessionId, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.onExitCallback?.(sessionId, exitCode)
      this.projectToSession.delete(projectId)
      this.terminals.delete(sessionId)
    })

    this.projectToSession.set(projectId, sessionId)
    this.terminals.set(sessionId, managed)
    return session
  }

  write(sessionId: string, data: string): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal) {
      terminal.ptyProcess.write(data)
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal) {
      terminal.ptyProcess.resize(cols, rows)
    }
  }

  close(sessionId: string): void {
    const terminal = this.terminals.get(sessionId)
    if (terminal) {
      this.projectToSession.delete(terminal.session.projectId)
      terminal.ptyProcess.kill()
      this.terminals.delete(sessionId)
    }
  }

  getScrollback(sessionId: string): string {
    return this.terminals.get(sessionId)?.scrollback ?? ''
  }

  getSessionByProject(projectId: string): TerminalSession | null {
    const sessionId = this.projectToSession.get(projectId)
    if (!sessionId) return null
    return this.terminals.get(sessionId)?.session ?? null
  }

  async shutdown(): Promise<void> {
    for (const [id] of this.terminals) {
      this.close(id)
    }
  }
}

export const terminalManager = new TerminalManager()
