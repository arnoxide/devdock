import { useRef, useEffect, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useTerminal } from '../../hooks/use-terminal'
import { useTerminalStore } from '../../stores/terminal-store'
import '@xterm/xterm/css/xterm.css'

interface TerminalViewProps {
  projectId: string
}

export default function TerminalView({ projectId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { getOrCreateSession } = useTerminalStore()

  useEffect(() => {
    let mounted = true
    const init = async (): Promise<void> => {
      const session = await getOrCreateSession(projectId)
      if (mounted) setSessionId(session.id)
    }
    init()
    return () => { mounted = false }
  }, [projectId])

  const { copyAll, copied } = useTerminal({ sessionId, containerRef })

  return (
    <div className="h-full min-h-[300px] flex flex-col bg-dock-bg rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-dock-border/50 shrink-0">
        <span className="text-[10px] text-dock-muted/50 select-none">
          Select text to copy · Right-click to copy/paste
        </span>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border border-dock-border hover:bg-dock-accent/10 hover:border-dock-accent/40 transition-all text-dock-muted hover:text-dock-accent"
          title="Copy all terminal output"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {copied ? 'Copied!' : 'Copy All'}
        </button>
      </div>
      <div ref={containerRef} className="xterm-container flex-1 overflow-hidden" />
    </div>
  )
}
