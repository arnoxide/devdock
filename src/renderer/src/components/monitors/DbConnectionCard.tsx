import { Database, Plug, PlugZap, AlertCircle } from 'lucide-react'
import { DbConnectionConfig, DbConnectionState } from '../../../../shared/types'
import Badge from '../ui/Badge'

interface DbConnectionCardProps {
  config: DbConnectionConfig
  state?: DbConnectionState
  onTest: () => void
  onRemove: () => void
}

export default function DbConnectionCard({
  config,
  state,
  onTest,
  onRemove
}: DbConnectionCardProps) {
  const statusVariant = state?.status === 'connected'
    ? 'success'
    : state?.status === 'error'
      ? 'danger'
      : state?.status === 'connecting'
        ? 'warning'
        : 'default'

  return (
    <div className="bg-dock-surface border border-dock-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-dock-accent/10 flex items-center justify-center">
            <Database size={16} className="text-dock-accent" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-dock-text">{config.name}</h4>
            <span className="text-xs text-dock-muted uppercase">{config.type}</span>
          </div>
        </div>
        <Badge variant={statusVariant}>
          {state?.status || 'disconnected'}
        </Badge>
      </div>

      {state?.serverVersion && (
        <p className="text-xs text-dock-muted mb-2">Version: {state.serverVersion}</p>
      )}

      {state?.latencyMs != null && (
        <p className="text-xs text-dock-muted mb-2">Latency: {state.latencyMs}ms</p>
      )}

      {state?.error && (
        <div className="flex items-center gap-1.5 text-xs text-dock-red mb-2">
          <AlertCircle size={12} />
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onTest}
          className="flex items-center gap-1 text-xs text-dock-accent hover:text-blue-400 transition-colors"
        >
          <PlugZap size={12} />
          Test Connection
        </button>
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-xs text-dock-red hover:text-red-400 transition-colors"
        >
          <Plug size={12} />
          Disconnect
        </button>
      </div>
    </div>
  )
}
