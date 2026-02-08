import * as pty from 'node-pty'
import { v4 as uuid } from 'uuid'
import { TerminalSession } from '../../shared/types'

interface ManagedTerminal {
  ptyProcess: pty.IPty
  session: TerminalSession
}

export class TerminalManager {
  private terminals = new Map<string, ManagedTerminal>()
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

    const ptyProcess = pty.spawn(shellPath, [], {
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

    ptyProcess.onData((data) => {
      this.onDataCallback?.(sessionId, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      this.onExitCallback?.(sessionId, exitCode)
      this.terminals.delete(sessionId)
    })

    this.terminals.set(sessionId, { ptyProcess, session })
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
      terminal.ptyProcess.kill()
      this.terminals.delete(sessionId)
    }
  }

  async shutdown(): Promise<void> {
    for (const [id] of this.terminals) {
      this.close(id)
    }
  }
}

export const terminalManager = new TerminalManager()
