import { LogEntry as LogEntryType } from '../../../../shared/types'
import { format } from 'date-fns'

interface LogEntryProps {
  entry: LogEntryType
}

const levelColors = {
  debug: 'text-dock-muted',
  info: 'text-dock-accent',
  warn: 'text-dock-yellow',
  error: 'text-dock-red',
  fatal: 'text-dock-red font-bold'
}

const levelBadgeColors = {
  debug: 'bg-dock-card text-dock-muted',
  info: 'bg-dock-accent/10 text-dock-accent',
  warn: 'bg-dock-yellow/10 text-dock-yellow',
  error: 'bg-dock-red/10 text-dock-red',
  fatal: 'bg-dock-red/20 text-dock-red'
}

export default function LogEntryRow({ entry }: LogEntryProps) {
  return (
    <div className="flex items-start gap-2 py-0.5 px-2 hover:bg-dock-card/30 font-mono text-xs group">
      <span className="text-dock-muted/60 whitespace-nowrap flex-shrink-0">
        {format(new Date(entry.timestamp), 'HH:mm:ss.SSS')}
      </span>
      <span
        className={`px-1.5 py-0 rounded text-[10px] font-medium uppercase flex-shrink-0 ${
          levelBadgeColors[entry.level]
        }`}
      >
        {entry.level}
      </span>
      <span className={`break-all whitespace-pre-wrap ${levelColors[entry.level]}`}>
        {entry.message}
      </span>
    </div>
  )
}
