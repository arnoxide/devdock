import { useState } from 'react'
import { Key, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import { useGitHubStore } from '../../stores/github-store'

export default function GitHubTokenForm() {
  const credentials = useGitHubStore((s) => s.credentials)
  const setToken = useGitHubStore((s) => s.setToken)
  const removeToken = useGitHubStore((s) => s.removeToken)
  const testConnection = useGitHubStore((s) => s.testConnection)

  const [token, setTokenInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const handleRemove = async () => {
    await removeToken()
    setTokenInput('')
    setTestResult(null)
  }

  if (credentials) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex items-center gap-3">
          {credentials.avatarUrl && (
            <img
              src={credentials.avatarUrl}
              alt={credentials.username}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium text-dock-text">
              Connected as {credentials.username}
            </p>
            <p className="text-xs text-dock-muted">GitHub Personal Access Token</p>
          </div>
          <CheckCircle size={18} className="text-dock-green ml-2" />
        </div>
        <Button variant="danger" size="sm" onClick={handleRemove}>
          <Trash2 size={14} />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-dock-card flex items-center justify-center">
        <Key size={24} className="text-dock-muted" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-dock-text">Connect to GitHub</h3>
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
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleTest} disabled={!token.trim() || testing}>
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            Test
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!token.trim() || saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Connect
          </Button>
        </div>
      </div>
    </div>
  )
}
