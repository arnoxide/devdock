import { CheckCircle2, XCircle, Loader2, Clock, ExternalLink, MinusCircle } from 'lucide-react'
import { GitHubWorkflowRun } from '../../../../shared/types'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusIcon({ status, conclusion }: { status: string; conclusion: string | null }) {
  if (status === 'in_progress' || status === 'queued' || status === 'pending') {
    return <Loader2 size={16} className="text-dock-yellow animate-spin" />
  }
  if (conclusion === 'success') {
    return <CheckCircle2 size={16} className="text-dock-green" />
  }
  if (conclusion === 'failure') {
    return <XCircle size={16} className="text-dock-red" />
  }
  if (conclusion === 'cancelled' || conclusion === 'skipped') {
    return <MinusCircle size={16} className="text-dock-muted" />
  }
  return <Clock size={16} className="text-dock-muted" />
}

interface Props {
  actions: GitHubWorkflowRun[]
}

export default function GitHubActionsList({ actions }: Props) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-12 text-dock-muted text-sm">
        No workflow runs found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {actions.map((run) => (
        <div
          key={run.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dock-card transition-colors group"
        >
          <div className="shrink-0">
            <StatusIcon status={run.status} conclusion={run.conclusion} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dock-text truncate">{run.name}</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${
                  run.conclusion === 'success'
                    ? 'bg-dock-green/10 text-dock-green'
                    : run.conclusion === 'failure'
                      ? 'bg-dock-red/10 text-dock-red'
                      : run.status === 'in_progress'
                        ? 'bg-dock-yellow/10 text-dock-yellow'
                        : 'bg-dock-border text-dock-muted'
                }`}
              >
                {run.conclusion || run.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-dock-muted mt-0.5">
              <span className="truncate">{run.repoFullName}</span>
              <span>{run.headBranch}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatTimeAgo(run.createdAt)}
              </span>
              <span className="capitalize">{run.event}</span>
            </div>
          </div>
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-dock-muted hover:text-dock-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.preventDefault()
              window.open(run.htmlUrl, '_blank')
            }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      ))}
    </div>
  )
}
