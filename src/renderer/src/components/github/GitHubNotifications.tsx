import { Bell, Check, CheckCheck, GitPullRequest, CircleDot, MessageSquare, Tag } from 'lucide-react'
import Button from '../ui/Button'
import { GitHubNotification } from '../../../../shared/types'
import { useGitHubStore } from '../../stores/github-store'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function SubjectIcon({ type }: { type: string }) {
  switch (type) {
    case 'PullRequest':
      return <GitPullRequest size={14} className="text-dock-accent" />
    case 'Issue':
      return <CircleDot size={14} className="text-dock-green" />
    case 'Discussion':
      return <MessageSquare size={14} className="text-dock-yellow" />
    case 'Release':
      return <Tag size={14} className="text-purple-400" />
    default:
      return <Bell size={14} className="text-dock-muted" />
  }
}

interface Props {
  notifications: GitHubNotification[]
}

export default function GitHubNotifications({ notifications }: Props) {
  const markRead = useGitHubStore((s) => s.markNotificationRead)
  const markAllRead = useGitHubStore((s) => s.markAllNotificationsRead)

  const unreadCount = notifications.filter((n) => n.unread).length

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 text-dock-muted text-sm">
        No notifications
      </div>
    )
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <span className="text-xs text-dock-muted">{unreadCount} unread</span>
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck size={14} />
            Mark all read
          </Button>
        </div>
      )}
      <div className="space-y-1">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dock-card transition-colors group ${
              n.unread ? 'bg-dock-accent/5' : ''
            }`}
          >
            <div className="shrink-0">
              <SubjectIcon type={n.subject.type} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm truncate ${n.unread ? 'text-dock-text font-medium' : 'text-dock-muted'}`}>
                  {n.subject.title}
                </span>
                {n.unread && (
                  <span className="w-2 h-2 rounded-full bg-dock-accent shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-dock-muted mt-0.5">
                <span className="truncate">{n.repository}</span>
                <span>{n.subject.type}</span>
                <span>{formatTimeAgo(n.updatedAt)}</span>
                <span className="capitalize">{n.reason.replace(/_/g, ' ')}</span>
              </div>
            </div>
            {n.unread && (
              <button
                onClick={() => markRead(n.id)}
                className="text-dock-muted hover:text-dock-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Mark as read"
              >
                <Check size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
