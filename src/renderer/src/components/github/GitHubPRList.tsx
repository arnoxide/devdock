import { GitMerge, GitPullRequest, ExternalLink, Clock } from 'lucide-react'
import { GitHubPR } from '../../../../shared/types'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface Props {
  prs: GitHubPR[]
}

export default function GitHubPRList({ prs }: Props) {
  if (prs.length === 0) {
    return (
      <div className="text-center py-12 text-dock-muted text-sm">
        No pull requests found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {prs.map((pr) => (
        <div
          key={pr.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dock-card transition-colors group"
        >
          <div className="shrink-0">
            {pr.state === 'closed' ? (
              <GitMerge size={16} className="text-purple-400" />
            ) : (
              <GitPullRequest
                size={16}
                className={pr.draft ? 'text-dock-muted' : 'text-dock-green'}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dock-text truncate">{pr.title}</span>
              {pr.draft && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-dock-border text-dock-muted shrink-0">
                  Draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-dock-muted mt-0.5">
              <span className="truncate">{pr.repoFullName}</span>
              <span>#{pr.number}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatTimeAgo(pr.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {pr.labels.slice(0, 2).map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 text-[10px] rounded bg-dock-accent/10 text-dock-accent"
              >
                {label}
              </span>
            ))}
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-dock-muted hover:text-dock-text opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                window.open(pr.htmlUrl, '_blank')
              }}
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
