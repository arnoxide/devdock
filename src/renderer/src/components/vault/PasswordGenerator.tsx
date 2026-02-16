import { useState, useCallback } from 'react'
import { Copy, RefreshCw, Check } from 'lucide-react'
import { generatePassword, passwordStrength, PasswordOptions } from '../../utils/vault-client'

export default function PasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false
  })
  const [password, setPassword] = useState(() => generatePassword({
    length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeSimilar: false
  }))
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    setPassword(generatePassword(options))
    setCopied(false)
  }, [options])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [password])

  const strength = password ? passwordStrength(password) : null

  const toggle = (key: keyof PasswordOptions) => {
    const next = { ...options, [key]: !options[key] }
    setOptions(next)
    setPassword(generatePassword(next))
    setCopied(false)
  }

  const setLength = (len: number) => {
    const next = { ...options, length: len }
    setOptions(next)
    setPassword(generatePassword(next))
    setCopied(false)
  }

  return (
    <div className="space-y-5">
      {/* Output */}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={password}
          className="flex-1 bg-dock-bg border border-dock-border rounded-lg px-3 py-2.5 text-dock-text font-mono text-sm"
        />
        <button onClick={copy} className="p-2.5 rounded-lg bg-dock-card border border-dock-border hover:border-dock-accent transition-colors" title="Copy">
          {copied ? <Check size={16} className="text-dock-green" /> : <Copy size={16} className="text-dock-muted" />}
        </button>
        <button onClick={generate} className="p-2.5 rounded-lg bg-dock-accent text-white hover:bg-dock-accent/80 transition-colors" title="Generate">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Strength bar */}
      {strength && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-dock-muted">Strength</span>
            <span className={`text-${strength.color}`}>{strength.label}</span>
          </div>
          <div className="h-1.5 bg-dock-bg rounded-full overflow-hidden">
            <div
              className={`h-full bg-${strength.color} transition-all rounded-full`}
              style={{ width: `${(strength.score / 7) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Length slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-dock-muted">Length</span>
          <span className="text-dock-text font-mono">{options.length}</span>
        </div>
        <input
          type="range"
          min={4}
          max={128}
          value={options.length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full accent-dock-accent"
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ['uppercase', 'A-Z'],
          ['lowercase', 'a-z'],
          ['numbers', '0-9'],
          ['symbols', '!@#$'],
          ['excludeSimilar', 'Exclude similar (i,l,1,O,0)']
        ] as const).map(([key, label]) => (
          <label key={key} className={`flex items-center gap-2 text-sm cursor-pointer ${key === 'excludeSimilar' ? 'col-span-2' : ''}`}>
            <input
              type="checkbox"
              checked={options[key] as boolean}
              onChange={() => toggle(key)}
              className="accent-dock-accent rounded"
            />
            <span className="text-dock-text">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
