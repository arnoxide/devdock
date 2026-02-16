import { useState } from 'react'
import { Copy, Check, ArrowDownUp } from 'lucide-react'
import { encodeBase64, decodeBase64 } from '../../utils/vault-client'

export default function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const convert = () => {
    setError('')
    try {
      if (mode === 'encode') {
        setOutput(encodeBase64(input))
      } else {
        setOutput(decodeBase64(input))
      }
    } catch {
      setError(mode === 'decode' ? 'Invalid Base64 input' : 'Encoding failed')
    }
  }

  const swap = () => {
    setMode(mode === 'encode' ? 'decode' : 'encode')
    setInput(output)
    setOutput(input)
    setError('')
  }

  const copy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1 bg-dock-bg rounded-lg p-1">
        <button
          onClick={() => { setMode('encode'); setOutput(''); setError('') }}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'encode' ? 'bg-dock-accent text-white' : 'text-dock-muted hover:text-dock-text'
          }`}
        >
          Encode
        </button>
        <button
          onClick={() => { setMode('decode'); setOutput(''); setError('') }}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'decode' ? 'bg-dock-accent text-white' : 'text-dock-muted hover:text-dock-text'
          }`}
        >
          Decode
        </button>
      </div>

      <div>
        <label className="text-xs text-dock-muted mb-1 block uppercase tracking-wide">
          {mode === 'encode' ? 'Plain Text' : 'Base64 Input'}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 string...'}
          rows={4}
          className="w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm font-mono text-dock-text placeholder-dock-muted resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={convert} className="px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
          {mode === 'encode' ? 'Encode' : 'Decode'}
        </button>
        <button onClick={swap} className="flex items-center gap-1.5 px-3 py-2 bg-dock-card border border-dock-border rounded-lg text-sm text-dock-muted hover:text-dock-text transition-colors" title="Swap input/output">
          <ArrowDownUp size={14} /> Swap
        </button>
      </div>

      {error && <p className="text-sm text-dock-red">{error}</p>}

      {output && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-dock-muted uppercase tracking-wide">
              {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
            </span>
            <button onClick={copy} className="text-xs text-dock-accent hover:underline flex items-center gap-1">
              {copied ? <Check size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
          <pre className="bg-dock-bg border border-dock-border rounded-lg p-3 text-xs font-mono text-dock-text break-all whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}
