import { useRef, useEffect, useState } from 'react'
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

    // Don't close the PTY session on unmount — keep it alive for when user comes back
    return () => {
      mounted = false
    }
  }, [projectId])

  useTerminal({ sessionId, containerRef })

  return (
    <div className="h-full min-h-[300px] bg-dock-bg rounded-lg overflow-hidden">
      <div ref={containerRef} className="xterm-container h-full" />
    </div>
  )
}
