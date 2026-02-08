import { useEffect, useRef } from 'react'
import { useProcessStore } from '../../stores/process-store'

interface ProcessOutputProps {
  projectId: string
  autoScroll?: boolean
}

export default function ProcessOutput({ projectId, autoScroll = true }: ProcessOutputProps) {
  const output = useProcessStore((s) => s.outputs[projectId] || [])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [output, autoScroll])

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[200px] bg-dock-bg rounded-lg p-3 overflow-y-auto font-mono text-xs leading-relaxed"
    >
      {output.length === 0 ? (
        <span className="text-dock-muted">No output yet. Start the server to see output here.</span>
      ) : (
        output.map((line, i) => (
          <div key={i} className="text-dock-text/90 whitespace-pre-wrap break-all">
            {line}
          </div>
        ))
      )}
    </div>
  )
}
