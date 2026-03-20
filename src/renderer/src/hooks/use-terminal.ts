import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

interface UseTerminalOptions {
  sessionId: string | null
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function useTerminal({ sessionId, containerRef }: UseTerminalOptions) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const initTerminal = useCallback(() => {
    if (!containerRef.current || !sessionId) return

    // Cleanup previous terminal
    if (terminalRef.current) {
      terminalRef.current.dispose()
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#0f1117',
        foreground: '#e4e6f0',
        cursor: '#3b82f6',
        selectionBackground: '#3b82f644',
        black: '#1a1d27',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e6f0',
        brightBlack: '#8b8fa3',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f8fafc'
      },
      allowTransparency: true,
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    terminal.open(containerRef.current)
    fitAddon.fit()

    // Replay scrollback from the backend buffer so history is preserved on navigation
    window.api.getTerminalScrollback(sessionId).then((scrollback: string) => {
      if (scrollback) terminal.write(scrollback)
    })

    // Handle user input -> send to pty
    terminal.onData((data) => {
      if (sessionId) {
        window.api.writeTerminal(sessionId, data)
      }
    })

    // Handle pty output -> write to terminal
    const cleanup = window.api.onTerminalData((msg: any) => {
      if (msg.sessionId === sessionId) {
        terminal.write(msg.data)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (sessionId) {
        window.api.resizeTerminal(sessionId, terminal.cols, terminal.rows)
      }
    })
    resizeObserver.observe(containerRef.current)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    cleanupRef.current = () => {
      cleanup()
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [sessionId, containerRef])

  useEffect(() => {
    initTerminal()
    return () => {
      cleanupRef.current?.()
    }
  }, [initTerminal])

  return {
    terminal: terminalRef.current,
    fit: () => fitAddonRef.current?.fit()
  }
}
