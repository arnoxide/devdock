import { useState } from 'react'
import { Key, CheckCircle, XCircle, Loader2, Trash2, RefreshCw, Plus } from 'lucide-react'
import Button from '../ui/Button'
import { useGitHubStore } from '../../stores/github-store'

export default function GitHubTokenForm() {
  const credentials = useGitHubStore((s) => s.credentials)
  const accounts = useGitHubStore((s) => s.accounts)
  const setToken = useGitHubStore((s) => s.setToken)
  const removeToken = useGitHubStore((s) => s.removeToken)
  const switchAccount = useGitHubStore((s) => s.switchAccount)
  const testConnection = useGitHubStore((s) => s.testConnection)
  const connectionError = useGitHubStore((s) => s.connectionError)

  const [token, setTokenInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const handleTest = async () => {
    if (!token.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(token.trim())
      setTestResult(result)
    } catch {
      setTestResult({ ok: false, error: 'Connection failed' })
    }
    setTesting(false)
  }

  const handleSave = async () => {
    if (!token.trim()) return
    setSaving(true)
    try {
      await setToken(token.trim())
      setTokenInput('')
      setTestResult(null)
    } catch {
      // Error handled in store
    }
    setSaving(false)
  }

  const handleRemove = async (username?: string) => {
    await removeToken(username)
    setTokenInput('')
    setTestResult(null)
  }

  const handleSwitch = async (username: string) => {
    if (username === credentials?.username) return
    setSwitchingTo(username)
    try {
      await switchAccount(username)
    } finally {
      setSwitchingTo(null)
    }
  }

  return (
    <div className="space-y-5 py-2">
      {accounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-dock-text">GitHub accounts</h3>
              <p className="text-xs text-dock-muted mt-0.5">Switch the active account for repos, PRs, actions, and notifications.</p>
            </div>
            {credentials && (
              <span className="text-xs text-dock-muted bg-dock-bg border border-dock-border px-2 py-1 rounded-lg">
                Active: {credentials.username}
              </span>
            )}
          </div>

          <div className="grid gap-2">
            {accounts.map((account) => {
              const active = account.username === credentials?.username
              return (
                <div
                  key={account.username}
                  className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                    active ? 'bg-dock-accent/10 border-dock-accent/30' : 'bg-dock-bg border-dock-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {account.avatarUrl ? (
                      <img src={account.avatarUrl} alt={account.username} className="w-9 h-9 rounded-full" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-dock-card flex items-center justify-center">
                        <Key size={16} className="text-dock-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dock-text truncate">{account.username}</p>
                      <p className="text-xs text-dock-muted">Personal Access Token</p>
                    </div>
                    {active && <CheckCircle size={16} className="text-dock-green shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!active && (
                      <Button variant="secondary" size="sm" onClick={() => handleSwitch(account.username)} disabled={switchingTo === account.username}>
                        {switchingTo === account.username ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Switch
                      </Button>
                    )}
                    <Button variant="danger" size="sm" onClick={() => handleRemove(account.username)} title={`Remove ${account.username}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 py-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-dock-card flex items-center justify-center">
          {accounts.length > 0 ? <Plus size={24} className="text-dock-muted" /> : <Key size={24} className="text-dock-muted" />}
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold text-dock-text">
            {accounts.length > 0 ? 'Add another GitHub account' : 'Connect to GitHub'}
          </h3>
          <p className="text-xs text-dock-muted mt-1">
            Enter a Personal Access Token with repo, notifications, and workflow scopes
          </p>
        </div>
        <div className="w-full space-y-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 text-sm bg-dock-bg border border-dock-border rounded-lg text-dock-text placeholder:text-dock-muted/50 focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
          />
          {testResult && (
            <div
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                testResult.ok
                  ? 'bg-dock-green/10 text-dock-green'
                  : 'bg-dock-red/10 text-dock-red'
              }`}
            >
              {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.ok ? 'Connection successful' : testResult.error || 'Connection failed'}
            </div>
          )}
          {connectionError && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-dock-red/10 text-dock-red">
              <XCircle size={14} />
              {connectionError}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleTest} disabled={!token.trim() || testing}>
              {testing ? <Loader2 size={14} className="animate-spin" /> : null}
              Test
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!token.trim() || saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {accounts.length > 0 ? 'Add Account' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
