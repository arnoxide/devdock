import { useState } from 'react'
import { Copy, Check, ArrowRight } from 'lucide-react'
import { decodeJWT, createJWT } from '../../utils/vault-client'

export default function JWTTool() {
  const [tab, setTab] = useState<'decode' | 'create'>('decode')
  const [token, setToken] = useState('')
  const [decoded, setDecoded] = useState<{ header: any; payload: any; signature: string } | null>(null)
  const [decodeError, setDecodeError] = useState('')

  const [payload, setPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}')
  const [secret, setSecret] = useState('')
  const [createdToken, setCreatedToken] = useState('')
  const [createError, setCreateError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleDecode = () => {
    setDecodeError('')
    const result = decodeJWT(token.trim())
    if (result) {
      setDecoded(result)
    } else {
      setDecoded(null)
      setDecodeError('Invalid JWT token')
    }
  }

  const handleCreate = async () => {
    setCreateError('')
    if (!secret.trim()) {
      setCreateError('Secret key is required')
      return
    }
    try {
      const obj = JSON.parse(payload)
      const jwt = await createJWT(obj, secret)
      setCreatedToken(jwt)
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setCreateError('Invalid JSON payload')
      } else {
        setCreateError(err.message || 'Failed to create JWT')
      }
    }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-dock-bg rounded-lg p-1">
        {(['decode', 'create'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-dock-accent text-white' : 'text-dock-muted hover:text-dock-text'
            }`}
          >
            {t === 'decode' ? 'Decode' : 'Create'}
          </button>
        ))}
      </div>

      {tab === 'decode' ? (
        <div className="space-y-3">
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste JWT token here..."
            rows={3}
            className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text placeholder-dock-muted resize-none"
          />
          <button onClick={handleDecode} className="flex items-center gap-2 px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
            <ArrowRight size={14} /> Decode
          </button>
          {decodeError && <p className="text-sm text-dock-red">{decodeError}</p>}
          {decoded && (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-dock-muted mb-1 uppercase tracking-wide">Header</div>
                <pre className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-accent overflow-x-auto">
                  {JSON.stringify(decoded.header, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs text-dock-muted mb-1 uppercase tracking-wide">Payload</div>
                <pre className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-green overflow-x-auto">
                  {JSON.stringify(decoded.payload, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs text-dock-muted mb-1 uppercase tracking-wide">Signature</div>
                <p className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-yellow break-all">
                  {decoded.signature}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-dock-muted mb-1 block uppercase tracking-wide">Payload (JSON)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={5}
              className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-dock-muted mb-1 block uppercase tracking-wide">Secret Key</label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="HMAC secret..."
              className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text placeholder-dock-muted"
            />
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
            <ArrowRight size={14} /> Create JWT
          </button>
          {createError && <p className="text-sm text-dock-red">{createError}</p>}
          {createdToken && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-dock-muted uppercase tracking-wide">Generated Token</span>
                <button onClick={() => copy(createdToken)} className="text-xs text-dock-accent hover:underline flex items-center gap-1">
                  {copied ? <Check size={12} /> : <Copy size={12} />} Copy
                </button>
              </div>
              <p className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-text break-all">
                {createdToken}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
