import { useState } from 'react'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { PlatformProvider, PlatformCredentials } from '../../../../shared/types'
import { useProdMetricsStore } from '../../stores/prod-metrics-store'
import ProviderIcon, { getProviderLabel } from './ProviderIcon'
import Button from '../ui/Button'
import Input from '../ui/Input'

const PROVIDERS: PlatformProvider[] = ['render', 'railway', 'vercel', 'aws']

export default function ProdCredentialsForm() {
  const { credentials, setCredentials, removeCredentials, testConnection } =
    useProdMetricsStore()
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, Partial<PlatformCredentials>>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})

  const getCredForProvider = (p: PlatformProvider) =>
    credentials.find((c) => c.provider === p)

  const getDraft = (p: PlatformProvider) => drafts[p] || {}

  const updateDraft = (p: PlatformProvider, updates: Partial<PlatformCredentials>) => {
    setDrafts((d) => ({ ...d, [p]: { ...d[p], ...updates } }))
  }

  const handleSave = async (provider: PlatformProvider) => {
    const draft = getDraft(provider)
    const existing = getCredForProvider(provider)

    const creds: PlatformCredentials = {
      provider,
      token: draft.token ?? existing?.token ?? '',
      accessKeyId: draft.accessKeyId ?? existing?.accessKeyId,
      secretAccessKey: draft.secretAccessKey ?? existing?.secretAccessKey,
      region: draft.region ?? existing?.region,
      enabled: draft.enabled ?? existing?.enabled ?? true,
      addedAt: existing?.addedAt ?? new Date().toISOString()
    }

    await setCredentials(creds)
    setDrafts((d) => {
      const next = { ...d }
      delete next[provider]
      return next
    })
  }

  const handleTest = async (provider: PlatformProvider) => {
    setTesting((t) => ({ ...t, [provider]: true }))
    await testConnection(provider)
    setTesting((t) => ({ ...t, [provider]: false }))
  }

  const handleRemove = async (provider: PlatformProvider) => {
    await removeCredentials(provider)
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map((provider) => {
        const existing = getCredForProvider(provider)
        const draft = getDraft(provider)
        const tokenValue = draft.token ?? existing?.token ?? ''
        const isAws = provider === 'aws'
        const showToken = showTokens[provider]
        const hasDraft =
          draft.token !== undefined ||
          draft.accessKeyId !== undefined ||
          draft.secretAccessKey !== undefined ||
          draft.region !== undefined

        return (
          <div
            key={provider}
            className="p-3 rounded-lg border border-dock-border bg-dock-card/30 space-y-2"
          >
            <div className="flex items-center gap-2">
              <ProviderIcon provider={provider} size="sm" />
              <span className="text-sm font-medium text-dock-text flex-1">
                {getProviderLabel(provider)}
              </span>
              {existing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(provider)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>

            {isAws ? (
              <>
                <Input
                  label="Access Key ID"
                  placeholder="AKIA..."
                  value={draft.accessKeyId ?? existing?.accessKeyId ?? ''}
                  onChange={(e) => updateDraft(provider, { accessKeyId: e.target.value })}
                />
                <div className="relative">
                  <Input
                    label="Secret Access Key"
                    type={showToken ? 'text' : 'password'}
                    placeholder="Secret key"
                    value={draft.secretAccessKey ?? existing?.secretAccessKey ?? ''}
                    onChange={(e) =>
                      updateDraft(provider, { secretAccessKey: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowTokens((s) => ({ ...s, [provider]: !s[provider] }))
                    }
                    className="absolute right-2 top-7 text-dock-muted hover:text-dock-text"
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Input
                  label="Region"
                  placeholder="us-east-1"
                  value={draft.region ?? existing?.region ?? ''}
                  onChange={(e) => updateDraft(provider, { region: e.target.value })}
                />
              </>
            ) : (
              <div className="relative">
                <Input
                  label="API Token"
                  type={showToken ? 'text' : 'password'}
                  placeholder={`Paste your ${getProviderLabel(provider)} API token`}
                  value={tokenValue}
                  onChange={(e) => updateDraft(provider, { token: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowTokens((s) => ({ ...s, [provider]: !s[provider] }))
                  }
                  className="absolute right-2 top-7 text-dock-muted hover:text-dock-text"
                >
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => handleSave(provider)}
                disabled={!hasDraft && !existing}
              >
                {existing ? 'Update' : 'Save'}
              </Button>
              {existing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTest(provider)}
                  disabled={testing[provider]}
                >
                  {testing[provider] ? 'Testing...' : 'Test Connection'}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
