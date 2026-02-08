import { useEffect, useState } from 'react'
import { Trash2, ScrollText } from 'lucide-react'
import { LogLevel, LogSource } from '../../../shared/types'
import { useLogStore } from '../stores/log-store'
import { useProjectStore } from '../stores/project-store'
import { useDebounce } from '../hooks/use-debounce'
import LogList from '../components/logs/LogList'
import LogFilter from '../components/logs/LogFilter'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'

export default function LogViewerPage() {
  const { entries, loadLogs, clearLogs } = useLogStore()
  const { projects } = useProjectStore()
  const [selectedProject, setSelectedProject] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>([])
  const [selectedSources, setSelectedSources] = useState<LogSource[]>([])
  const [autoScroll, setAutoScroll] = useState(true)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    loadLogs(selectedProject, {
      search: debouncedSearch || undefined,
      level: selectedLevels.length > 0 ? selectedLevels : undefined,
      source: selectedSources.length > 0 ? selectedSources : undefined,
      limit: 1000
    })
  }, [selectedProject, debouncedSearch, selectedLevels, selectedSources])

  const filteredEntries = entries.filter((e) => {
    if (selectedProject !== 'all' && e.projectId !== selectedProject) return false
    if (selectedLevels.length > 0 && !selectedLevels.includes(e.level)) return false
    if (selectedSources.length > 0 && !selectedSources.includes(e.source)) return false
    if (debouncedSearch && !e.message.toLowerCase().includes(debouncedSearch.toLowerCase()))
      return false
    return true
  })

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Log Viewer</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Aggregated logs from all running processes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-dock-muted cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-dock-border"
            />
            Auto-scroll
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearLogs(selectedProject)}
          >
            <Trash2 size={14} />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-48">
          <Select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            options={[
              { value: 'all', label: 'All Projects' },
              ...projects.map((p) => ({ value: p.id, label: p.name }))
            ]}
          />
        </div>
        <div className="flex-1">
          <LogFilter
            search={search}
            onSearchChange={setSearch}
            selectedLevels={selectedLevels}
            onLevelsChange={setSelectedLevels}
            selectedSources={selectedSources}
            onSourcesChange={setSelectedSources}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <LogList entries={filteredEntries} autoScroll={autoScroll} />
      </div>

      <div className="text-xs text-dock-muted text-right">
        {filteredEntries.length} entries
      </div>
    </div>
  )
}
