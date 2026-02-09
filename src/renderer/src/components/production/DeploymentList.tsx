import { GitCommit, Clock, RotateCcw, ScrollText } from 'lucide-react'
import { ProdDeployment, PlatformProvider } from '../../../../shared/types'
import DeployStatusBadge from './DeployStatusBadge'
import Button from '../ui/Button'

interface DeploymentListProps {
  deployments: ProdDeployment[]
  provider: PlatformProvider
  onViewLogs: (deployId: string) => void
  onRollback: (deployId: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export default function DeploymentList({
  deployments,
  provider,
  onViewLogs,
  onRollback
}: DeploymentListProps) {
  if (deployments.length === 0) {
    return (
      <div className="text-xs text-dock-muted text-center py-8">No deployments found</div>
    )
  }

  return (
    <div className="space-y-2">
      {deployments.map((deploy) => (
        <div
          key={deploy.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-dock-border bg-dock-card/30 hover:bg-dock-card/50 transition-colors"
        >
          <DeployStatusBadge status={deploy.status} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {deploy.commitHash && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-dock-cyan">
                  <GitCommit size={10} />
                  {deploy.commitHash.substring(0, 7)}
                </span>
              )}
              {deploy.branch && (
                <span className="text-[10px] text-dock-purple">{deploy.branch}</span>
              )}
            </div>
            {deploy.commitMessage && (
              <p className="text-xs text-dock-text truncate mt-0.5">
                {deploy.commitMessage}
              </p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-dock-muted mt-1">
              <span className="flex items-center gap-1">
                <Clock size={9} />
                {timeAgo(deploy.createdAt)}
              </span>
              {deploy.duration !== null && (
                <span>{formatDuration(deploy.duration)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onViewLogs(deploy.id)}>
              <ScrollText size={12} />
            </Button>
            {deploy.status === 'live' || deploy.status === 'failed' ? (
              <Button variant="ghost" size="sm" onClick={() => onRollback(deploy.id)}>
                <RotateCcw size={12} />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
