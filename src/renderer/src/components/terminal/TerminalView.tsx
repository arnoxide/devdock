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
  const { createSession, closeSession } = useTerminalStore()

  useEffect(() => {
    let id: string | null = null

    const init = async (): Promise<void> => {
      const session = await createSession(projectId)
      id = session.id
      setSessionId(session.id)
    }

    init()

    return () => {
      if (id) closeSession(id)
    }
  }, [projectId])

  useTerminal({ sessionId, containerRef })

  return (
    <div className="h-full min-h-[300px] bg-dock-bg rounded-lg overflow-hidden">
      <div ref={containerRef} className="xterm-container h-full" />
    </div>
  )
}
