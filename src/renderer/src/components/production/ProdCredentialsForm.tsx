import { useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react'
import { PlatformProvider, PlatformCredentials } from '../../../../shared/types'
import { useProdMetricsStore } from '../../stores/prod-metrics-store'
import ProviderIcon, { getProviderLabel } from './ProviderIcon'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Badge from '../ui/Badge'

const PROVIDERS: PlatformProvider[] = [
  'vercel',
  'netlify',
  'cloudflare',
  'render',
  'railway',
  'fly',
  'heroku',
  'digitalocean',
  'aws'
]

function createCredentialId(provider: PlatformProvider): string {
  return `${provider}:${Date.now()}`
}

function getCredentialKey(creds: PlatformCredentials): string {
  return creds.id || `${creds.provider}:default`
}

function maskSecret(value?: string): string {
  if (!value) return 'No token saved'
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}

export default function ProdCredentialsForm() {
  const { credentials, setCredentials, removeCredentials, testConnection, providerStatuses } =
    useProdMetricsStore()
  const [selectedProvider, setSelectedProvider] = useState<PlatformProvider>('vercel')
  const [showSecret, setShowSecret] = useState(false)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<PlatformCredentials>>({})

  const selectedAccounts = useMemo(
    () => credentials.filter((credential) => credential.provider === selectedProvider),
    [credentials, selectedProvider]
  )

  const editingAccount = selectedAccounts.find((account) => getCredentialKey(account) === editingKey)
  const isAdding = editingKey !== null && !editingAccount
  const isAws = selectedProvider === 'aws'

  const startAdd = () => {
    const key = createCredentialId(selectedProvider)
    setEditingKey(key)
    setDraft({
      id: key,
      provider: selectedProvider,
      accountName: '',
      enabled: true
    })
    setShowSecret(false)
  }

  const startEdit = (account: PlatformCredentials) => {
    setEditingKey(getCredentialKey(account))
    setDraft(account)
    setShowSecret(false)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setDraft({})
    setShowSecret(false)
  }

  const handleSave = async () => {
    if (!editingKey) return

    const creds: PlatformCredentials = {
      id: editingAccount?.id || editingKey,
      provider: selectedProvider,
      accountName: draft.accountName?.trim() || editingAccount?.accountName || 'Default account',
      token: draft.token ?? editingAccount?.token ?? '',
      accessKeyId: draft.accessKeyId ?? editingAccount?.accessKeyId,
      secretAccessKey: draft.secretAccessKey ?? editingAccount?.secretAccessKey,
      region: draft.region ?? editingAccount?.region,
      enabled: draft.enabled ?? editingAccount?.enabled ?? true,
      addedAt: editingAccount?.addedAt ?? new Date().toISOString()
    }

    await setCredentials(creds)
    cancelEdit()
  }

  const handleTest = async (account: PlatformCredentials) => {
    const key = getCredentialKey(account)
    setTesting((state) => ({ ...state, [key]: true }))
    await testConnection(account.provider, key)
    setTesting((state) => ({ ...state, [key]: false }))
  }

  const handleRemove = async (account: PlatformCredentials) => {
    const key = getCredentialKey(account)
    const ok = window.confirm(`Remove ${account.accountName || getProviderLabel(account.provider)}?`)
    if (!ok) return
    await removeCredentials(account.provider, key)
    if (editingKey === key) cancelEdit()
  }

  const selectedProviderCount = selectedAccounts.length

  return (
    <div className="grid grid-cols-[190px_1fr] gap-4 min-h-[520px]">
      <aside className="rounded-lg border border-dock-border bg-dock-bg/40 overflow-hidden">
        <div className="px-3 py-3 border-b border-dock-border">
          <p className="text-xs font-semibold text-dock-muted uppercase tracking-wide">
            Providers
          </p>
        </div>
        <div className="p-2 space-y-1">
          {PROVIDERS.map((provider) => {
            const count = credentials.filter((credential) => credential.provider === provider).length
            const active = provider === selectedProvider

            return (
              <button
                key={provider}
                onClick={() => {
                  setSelectedProvider(provider)
                  cancelEdit()
                }}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'bg-dock-accent/10 text-dock-accent border border-dock-accent/25'
                    : 'text-dock-muted hover:text-dock-text hover:bg-dock-card/60 border border-transparent'
                }`}
              >
                <ProviderIcon provider={provider} size="sm" />
                <span className="text-sm font-medium flex-1">{getProviderLabel(provider)}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-dock-card border border-dock-border">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ProviderIcon provider={selectedProvider} />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-dock-text">
                {getProviderLabel(selectedProvider)} Accounts
              </h3>
              <p className="text-xs text-dock-muted">
                {selectedProviderCount} saved account{selectedProviderCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={startAdd}>
            <Plus size={14} />
            Add Account
          </Button>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
          <div className="space-y-2">
            {selectedAccounts.map((account) => {
              const key = getCredentialKey(account)
              const status = providerStatuses[key]
              const connected = status?.connectionStatus === 'connected'

              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 bg-dock-card/30 transition-colors ${
                    editingKey === key ? 'border-dock-accent/50' : 'border-dock-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-dock-text truncate">
                          {account.accountName || 'Default account'}
                        </p>
                        {status && (
                          <Badge variant={connected ? 'success' : 'danger'}>
                            {connected ? 'Connected' : status.connectionStatus}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-dock-muted truncate mt-1">
                        {isAws ? maskSecret(account.accessKeyId) : maskSecret(account.token)}
                      </p>
                      {account.region && (
                        <p className="text-[10px] text-dock-muted/80 mt-1">{account.region}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(account)}
                        disabled={testing[key]}
                      >
                        {testing[key] ? 'Testing' : 'Test'}
                      </Button>
                      <button
                        onClick={() => startEdit(account)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-dock-muted hover:text-dock-text hover:bg-white/10"
                        aria-label="Edit account"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleRemove(account)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-dock-muted hover:text-dock-red hover:bg-dock-red/10"
                        aria-label="Remove account"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {status?.error && (
                    <p className="flex items-center gap-1 text-[10px] text-dock-red mt-2">
                      <AlertCircle size={11} />
                      {status.error}
                    </p>
                  )}
                </div>
              )
            })}

            {selectedAccounts.length === 0 && (
              <div className="rounded-lg border border-dock-border bg-dock-card/20 py-12 text-center">
                <KeyRound size={28} className="mx-auto text-dock-muted mb-3" />
                <p className="text-sm font-medium text-dock-text">No accounts yet</p>
                <p className="text-xs text-dock-muted mt-1">
                  Add your first {getProviderLabel(selectedProvider)} account.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-dock-border bg-dock-bg/50 p-3 sticky top-0">
            {editingKey ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-dock-text">
                    {isAdding ? 'Add account' : 'Edit account'}
                  </p>
                  <p className="text-xs text-dock-muted mt-0.5">
                    {getProviderLabel(selectedProvider)} credentials
                  </p>
                </div>

                <Input
                  label="Account name"
                  placeholder="Personal, Work, Client A"
                  value={draft.accountName ?? ''}
                  onChange={(event) => setDraft((state) => ({ ...state, accountName: event.target.value }))}
                />

                {isAws ? (
                  <>
                    <Input
                      label="Access Key ID"
                      placeholder="AKIA..."
                      value={draft.accessKeyId ?? ''}
                      onChange={(event) => setDraft((state) => ({ ...state, accessKeyId: event.target.value }))}
                    />
                    <div className="relative">
                      <Input
                        label="Secret Access Key"
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Secret key"
                        value={draft.secretAccessKey ?? ''}
                        onChange={(event) => setDraft((state) => ({ ...state, secretAccessKey: event.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret((value) => !value)}
                        className="absolute right-2 top-7 text-dock-muted hover:text-dock-text"
                      >
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <Input
                      label="Region"
                      placeholder="us-east-1"
                      value={draft.region ?? ''}
                      onChange={(event) => setDraft((state) => ({ ...state, region: event.target.value }))}
                    />
                  </>
                ) : (
                  <div className="relative">
                    <Input
                      label="API Token"
                      type={showSecret ? 'text' : 'password'}
                      placeholder={`Paste your ${getProviderLabel(selectedProvider)} API token`}
                      value={draft.token ?? ''}
                      onChange={(event) => setDraft((state) => ({ ...state, token: event.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((value) => !value)}
                      className="absolute right-2 top-7 text-dock-muted hover:text-dock-text"
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" onClick={handleSave}>
                    <CheckCircle2 size={14} />
                    {isAdding ? 'Save' : 'Update'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <KeyRound size={26} className="mx-auto text-dock-muted mb-3" />
                <p className="text-sm font-medium text-dock-text">Select or add an account</p>
                <p className="text-xs text-dock-muted mt-1">
                  Credentials are edited one account at a time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
