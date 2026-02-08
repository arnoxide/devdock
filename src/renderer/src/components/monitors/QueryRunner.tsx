import { useState } from 'react'
import { Play, Trash2 } from 'lucide-react'
import { DbQueryResult } from '../../../../shared/types'
import Button from '../ui/Button'

interface QueryRunnerProps {
  connectionId: string
  onRunQuery: (connectionId: string, query: string) => Promise<DbQueryResult>
}

export default function QueryRunner({ connectionId, onRunQuery }: QueryRunnerProps) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<DbQueryResult | null>(null)
  const [running, setRunning] = useState(false)

  const handleRun = async (): Promise<void> => {
    if (!query.trim()) return
    setRunning(true)
    try {
      const res = await onRunQuery(connectionId, query)
      setResult(res)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter SQL query or collection name..."
          className="w-full h-24 bg-dock-bg border border-dock-border rounded-lg p-3 text-sm font-mono text-dock-text resize-none
            placeholder:text-dock-muted/50 focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleRun()
            }
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleRun} disabled={running || !query.trim()}>
          <Play size={12} />
          {running ? 'Running...' : 'Run Query'}
        </Button>
        {result && (
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
            <Trash2 size={12} />
            Clear
          </Button>
        )}
        {result && !result.error && (
          <span className="text-xs text-dock-muted">
            {result.rowCount} rows in {result.executionTimeMs}ms
          </span>
        )}
      </div>

      {result?.error && (
        <div className="bg-dock-red/10 border border-dock-red/20 rounded-lg p-3 text-xs text-dock-red">
          {result.error}
        </div>
      )}

      {result && !result.error && result.rows.length > 0 && (
        <div className="overflow-x-auto border border-dock-border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dock-card">
                {Object.keys(result.rows[0]).map((key) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left font-medium text-dock-muted border-b border-dock-border"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-dock-border/50 hover:bg-dock-card/50">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-1.5 text-dock-text font-mono">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'null')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
