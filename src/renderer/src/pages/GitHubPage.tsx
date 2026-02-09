import { useState, useEffect } from 'react'
import { RefreshCw, Github, Bell } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import GitHubTokenForm from '../components/github/GitHubTokenForm'
import GitHubRepoCard from '../components/github/GitHubRepoCard'
import GitHubPRList from '../components/github/GitHubPRList'
import GitHubIssueList from '../components/github/GitHubIssueList'
import GitHubActionsList from '../components/github/GitHubActionsList'
import GitHubNotifications from '../components/github/GitHubNotifications'
import { useGitHubStore } from '../stores/github-store'

type Tab = 'repos' | 'prs' | 'issues' | 'actions' | 'notifications'

const tabs: { id: Tab; label: string }[] = [
  { id: 'repos', label: 'Repositories' },
  { id: 'prs', label: 'Pull Requests' },
  { id: 'issues', label: 'Issues' },
  { id: 'actions', label: 'Actions' },
  { id: 'notifications', label: 'Notifications' }
]

export default function GitHubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('repos')
  const credentials = useGitHubStore((s) => s.credentials)
  const repos = useGitHubStore((s) => s.repos)
  const prs = useGitHubStore((s) => s.prs)
  const issues = useGitHubStore((s) => s.issues)
  const actions = useGitHubStore((s) => s.actions)
  const notifications = useGitHubStore((s) => s.notifications)
  const loading = useGitHubStore((s) => s.loading)
  const loadAll = useGitHubStore((s) => s.loadAll)

  useEffect(() => {
    if (credentials) {
      loadAll()
    }
  }, [credentials?.token])

  const unreadCount = notifications.filter((n) => n.unread).length

  const handleRefresh = () => {
    loadAll()
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Github size={22} className="text-dock-text" />
          <h1 className="text-lg font-semibold text-dock-text">GitHub</h1>
          {credentials && (
            <span className="text-xs text-dock-muted bg-dock-card px-2 py-1 rounded-lg">
              {credentials.username}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {credentials && (
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* No token — show setup form */}
      {!credentials && (
        <Card>
          <GitHubTokenForm />
        </Card>
      )}

      {/* Connected — show tabs and content */}
      {credentials && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-dock-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-dock-accent text-dock-accent'
                    : 'border-transparent text-dock-muted hover:text-dock-text'
                }`}
              >
                {tab.label}
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-dock-accent text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'repos' && <GitHubRepoCard repos={repos} />}
            {activeTab === 'prs' && <GitHubPRList prs={prs} />}
            {activeTab === 'issues' && <GitHubIssueList issues={issues} />}
            {activeTab === 'actions' && <GitHubActionsList actions={actions} />}
            {activeTab === 'notifications' && <GitHubNotifications notifications={notifications} />}
          </div>

          {/* Connection management at bottom */}
          <div className="pt-4 border-t border-dock-border">
            <GitHubTokenForm />
          </div>
        </>
      )}
    </div>
  )
}
