import { CircleDot, CheckCircle2, ExternalLink, MessageSquare, Clock } from 'lucide-react'
import { GitHubIssue } from '../../../../shared/types'

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
  issues: GitHubIssue[]
}

export default function GitHubIssueList({ issues }: Props) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-12 text-dock-muted text-sm">
        No issues found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dock-card transition-colors group"
        >
          <div className="shrink-0">
            {issue.state === 'closed' ? (
              <CheckCircle2 size={16} className="text-purple-400" />
            ) : (
              <CircleDot size={16} className="text-dock-green" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dock-text truncate">{issue.title}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-dock-muted mt-0.5">
              <span className="truncate">{issue.repoFullName}</span>
              <span>#{issue.number}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatTimeAgo(issue.updatedAt)}
              </span>
              {issue.commentCount > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={10} />
                  {issue.commentCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 text-[10px] rounded bg-dock-accent/10 text-dock-accent"
              >
                {label}
              </span>
            ))}
            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="text-dock-muted hover:text-dock-text opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                window.open(issue.htmlUrl, '_blank')
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
