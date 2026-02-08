import { useEffect, useRef } from 'react'
import { LogEntry as LogEntryType } from '../../../../shared/types'
import LogEntryRow from './LogEntry'

interface LogListProps {
  entries: LogEntryType[]
  autoScroll?: boolean
}

export default function LogList({ entries, autoScroll = true }: LogListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries, autoScroll])

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-dock-muted">
        No log entries
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-dock-bg rounded-lg py-1">
      {entries.map((entry) => (
        <LogEntryRow key={entry.id} entry={entry} />
      ))}
    </div>
  )
}
