import { useState } from 'react'
import { Copy, Check, RefreshCw, Key } from 'lucide-react'
import { generateHexKey, generateApiKey } from '../../utils/vault-client'

type KeyType = 'hex-128' | 'hex-256' | 'hex-512' | 'api-key'

export default function SecretKeyGenerator() {
  const [keyType, setKeyType] = useState<KeyType>('hex-256')
  const [apiKeyLength, setApiKeyLength] = useState(32)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = () => {
    setCopied(false)
    switch (keyType) {
      case 'hex-128': setResult(generateHexKey(128)); break
      case 'hex-256': setResult(generateHexKey(256)); break
      case 'hex-512': setResult(generateHexKey(512)); break
      case 'api-key': setResult(generateApiKey(apiKeyLength)); break
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {([
          ['hex-128', '128-bit Hex'],
          ['hex-256', '256-bit Hex'],
          ['hex-512', '512-bit Hex'],
          ['api-key', 'API Key']
        ] as [KeyType, string][]).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setKeyType(type)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              keyType === type
                ? 'bg-dock-accent/10 border-dock-accent text-dock-accent'
                : 'bg-dock-card border-dock-border text-dock-muted hover:text-dock-text'
            }`}
          >
            <Key size={14} /> {label}
          </button>
        ))}
      </div>

      {keyType === 'api-key' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-dock-muted">Length</span>
          <input
            type="range"
            min={16}
            max={128}
            value={apiKeyLength}
            onChange={(e) => setApiKeyLength(Number(e.target.value))}
            className="flex-1 accent-dock-accent"
          />
          <span className="text-sm font-mono text-dock-text w-8 text-right">{apiKeyLength}</span>
        </div>
      )}

      <button onClick={generate} className="flex items-center gap-2 px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
        <RefreshCw size={14} /> Generate
      </button>

      {result && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-dock-muted uppercase tracking-wide">
              {keyType === 'api-key' ? 'API Key' : `${keyType.replace('hex-', '')} bit Hex Key`}
            </span>
            <button onClick={copy} className="text-xs text-dock-accent hover:underline flex items-center gap-1">
              {copied ? <Check size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
          <p className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-green break-all">
            {result}
          </p>
        </div>
      )}
    </div>
  )
}
