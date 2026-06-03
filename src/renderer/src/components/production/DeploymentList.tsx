import { GitCommit, Clock, RotateCcw, ScrollText, GitBranch } from 'lucide-react'
import { ProdDeployment, PlatformProvider } from '../../../../shared/types'
import DeployStatusBadge from './DeployStatusBadge'
import Button from '../ui/Button'
import Card, { CardBody } from '../ui/Card'

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
  const latestDeploy = deployments[0]

  if (deployments.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <ScrollText size={28} className="mx-auto text-dock-muted mb-3" />
          <p className="text-sm font-medium text-dock-text">No deployments found</p>
          <p className="text-xs text-dock-muted mt-1">
            Deployments will appear here after the provider returns history for this service.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-dock-border bg-dock-surface/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <DeployStatusBadge status={latestDeploy.status} />
            <p className="text-sm font-semibold text-dock-text truncate">
              {latestDeploy.commitMessage || latestDeploy.commitHash || latestDeploy.id}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-dock-muted mt-1">
            {latestDeploy.branch && (
              <span className="inline-flex items-center gap-1">
                <GitBranch size={11} />
                {latestDeploy.branch}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              {timeAgo(latestDeploy.createdAt)}
            </span>
            <span>{formatDuration(latestDeploy.duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => onViewLogs(latestDeploy.id)}>
            <ScrollText size={13} />
            Logs
          </Button>
          {(latestDeploy.status === 'live' || latestDeploy.status === 'failed') && (
            <Button variant="ghost" size="sm" onClick={() => onRollback(latestDeploy.id)}>
              <RotateCcw size={13} />
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dock-border/70">
              <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Commit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Branch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Started</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">Duration</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-dock-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deployments.map((deploy) => (
              <tr key={deploy.id} className="border-b border-dock-border/50 hover:bg-dock-card/35">
                <td className="px-4 py-3">
                  <DeployStatusBadge status={deploy.status} />
                </td>
                <td className="px-4 py-3 min-w-[260px]">
                  <div className="min-w-0">
                    <p className="text-xs text-dock-text truncate">
                      {deploy.commitMessage || 'No commit message'}
                    </p>
                    {deploy.commitHash && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-dock-cyan mt-1">
                        <GitCommit size={10} />
                        {deploy.commitHash.substring(0, 7)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-dock-purple">
                  {deploy.branch || '--'}
                </td>
                <td className="px-4 py-3 text-xs text-dock-muted">
                  {timeAgo(deploy.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs text-dock-text">
                  {formatDuration(deploy.duration)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onViewLogs(deploy.id)}>
                      <ScrollText size={12} />
                    </Button>
                    {deploy.status === 'live' || deploy.status === 'failed' ? (
                      <Button variant="ghost" size="sm" onClick={() => onRollback(deploy.id)}>
                        <RotateCcw size={12} />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 text-[10px] text-dock-muted border-t border-dock-border/70">
        Provider: {provider}
      </div>
    </Card>
  )
}
