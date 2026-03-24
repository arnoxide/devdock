import { useEffect, useRef, useCallback, useState } from 'react'
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
  const [copied, setCopied] = useState(false)

  const copySelection = useCallback(() => {
    const term = terminalRef.current
    if (!term) return false
    const sel = term.getSelection()
    if (sel) {
      navigator.clipboard.writeText(sel)
      return true
    }
    return false
  }, [])

  const copyAll = useCallback(async () => {
    if (!sessionId) return
    const scrollback = await window.api.getTerminalScrollback(sessionId)
    const text = scrollback || ''
    // Strip ANSI escape codes before copying
    const clean = text.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/\x1b\][^\x07]*\x07/g, '')
    await navigator.clipboard.writeText(clean)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [sessionId])

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
      copyOnSelect: true,
      rightClickSelectsWord: true,
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

    const doFit = (): void => {
      try {
        if (containerRef.current && containerRef.current.offsetHeight > 0) {
          fitAddon.fit()
          if (sessionId) window.api.resizeTerminal(sessionId, terminal.cols, terminal.rows)
        }
      } catch { /* ignore fit errors during layout */ }
    }

    // Try fitting at multiple points — layout may not be settled on first frame
    requestAnimationFrame(() => {
      doFit()
      setTimeout(doFit, 100)
      setTimeout(doFit, 300)
    })

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

    // Right-click: copy selection if any, otherwise paste from clipboard
    const handleContextMenu = async (e: MouseEvent): Promise<void> => {
      e.preventDefault()
      const sel = terminal.getSelection()
      if (sel) {
        navigator.clipboard.writeText(sel)
      } else {
        try {
          const text = await navigator.clipboard.readText()
          if (text && sessionId) window.api.writeTerminal(sessionId, text)
        } catch { /* clipboard permission denied */ }
      }
    }
    containerRef.current.addEventListener('contextmenu', handleContextMenu)

    // Handle resize — re-fit whenever the container changes size
    const resizeObserver = new ResizeObserver(doFit)
    resizeObserver.observe(containerRef.current)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    cleanupRef.current = () => {
      cleanup()
      resizeObserver.disconnect()
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu)
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
    fit: () => fitAddonRef.current?.fit(),
    copyAll,
    copySelection,
    copied
  }
}
