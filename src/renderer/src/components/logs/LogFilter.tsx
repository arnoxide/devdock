import { Search } from 'lucide-react'
import { LogLevel, LogSource } from '../../../../shared/types'

interface LogFilterProps {
  search: string
  onSearchChange: (value: string) => void
  selectedLevels: LogLevel[]
  onLevelsChange: (levels: LogLevel[]) => void
  selectedSources: LogSource[]
  onSourcesChange: (sources: LogSource[]) => void
}

const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
const sources: LogSource[] = ['stdout', 'stderr', 'system', 'api-monitor', 'db-monitor']

const levelColors: Record<LogLevel, string> = {
  debug: 'border-dock-muted/30 text-dock-muted',
  info: 'border-dock-accent/30 text-dock-accent',
  warn: 'border-dock-yellow/30 text-dock-yellow',
  error: 'border-dock-red/30 text-dock-red',
  fatal: 'border-dock-red/50 text-dock-red'
}

export default function LogFilter({
  search,
  onSearchChange,
  selectedLevels,
  onLevelsChange,
  selectedSources,
  onSourcesChange
}: LogFilterProps) {
  const toggleLevel = (level: LogLevel): void => {
    if (selectedLevels.includes(level)) {
      onLevelsChange(selectedLevels.filter((l) => l !== level))
    } else {
      onLevelsChange([...selectedLevels, level])
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search logs..."
          className="w-full bg-dock-bg border border-dock-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-dock-text
            placeholder:text-dock-muted/50 focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
        />
      </div>

      <div className="flex items-center gap-1">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={`px-2 py-1 rounded text-[10px] font-medium uppercase border transition-colors ${
              selectedLevels.length === 0 || selectedLevels.includes(level)
                ? levelColors[level] + ' bg-dock-card'
                : 'border-transparent text-dock-muted/30'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}
