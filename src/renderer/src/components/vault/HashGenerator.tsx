import { useState } from 'react'
import { Copy, Check, Hash } from 'lucide-react'
import { hashText } from '../../utils/vault-client'

type Algorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export default function HashGenerator() {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA-256')
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!input) return
    const hash = await hashText(input, algorithm)
    setResult(hash)
  }

  const copy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-dock-muted mb-1 block uppercase tracking-wide">Input Text</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          rows={4}
          className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm text-dock-text placeholder-dock-muted resize-none"
        />
      </div>

      <div className="flex gap-3 items-center">
        <div className="flex gap-1 bg-dock-bg rounded-lg p-1">
          {(['SHA-1', 'SHA-256', 'SHA-512'] as Algorithm[]).map((a) => (
            <button
              key={a}
              onClick={() => setAlgorithm(a)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                algorithm === a ? 'bg-dock-accent text-white' : 'text-dock-muted hover:text-dock-text'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <button onClick={generate} className="flex items-center gap-2 px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
          <Hash size={14} /> Hash
        </button>
      </div>

      {result && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-dock-muted uppercase tracking-wide">{algorithm} Hash</span>
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
