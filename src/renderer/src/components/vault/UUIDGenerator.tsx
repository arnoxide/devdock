import { useState, useCallback } from 'react'
import { Copy, Check, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { generateUUID, generateUUIDs } from '../../utils/vault-client'

export default function UUIDGenerator() {
  const [uuids, setUuids] = useState<string[]>([generateUUID()])
  const [bulkCount, setBulkCount] = useState(5)
  const [copied, setCopied] = useState<number | null>(null)
  const [allCopied, setAllCopied] = useState(false)

  const addOne = useCallback(() => {
    setUuids((prev) => [generateUUID(), ...prev])
  }, [])

  const generateBulk = useCallback(() => {
    setUuids(generateUUIDs(bulkCount))
  }, [bulkCount])

  const copyOne = (idx: number) => {
    navigator.clipboard.writeText(uuids[idx])
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'))
    setAllCopied(true)
    setTimeout(() => setAllCopied(false), 2000)
  }

  const removeOne = (idx: number) => {
    setUuids((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <button onClick={addOne} className="flex items-center gap-2 px-4 py-2 bg-dock-accent text-white rounded-lg text-sm hover:bg-dock-accent/80 transition-colors">
          <Plus size={14} /> Generate UUID
        </button>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={100}
            value={bulkCount}
            onChange={(e) => setBulkCount(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-16 bg-dock-bg border border-dock-border rounded-lg px-2 py-2 text-sm text-dock-text text-center"
          />
          <button onClick={generateBulk} className="flex items-center gap-2 px-3 py-2 bg-dock-card border border-dock-border rounded-lg text-sm text-dock-muted hover:text-dock-text transition-colors">
            <RefreshCw size={14} /> Bulk
          </button>
        </div>
        {uuids.length > 0 && (
          <button onClick={copyAll} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-dock-card border border-dock-border rounded-lg text-dock-muted hover:text-dock-text transition-colors ml-auto">
            {allCopied ? <Check size={12} className="text-dock-green" /> : <Copy size={12} />}
            Copy All
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {uuids.map((uuid, i) => (
          <div key={`${uuid}-${i}`} className="flex items-center gap-2 bg-dock-card border border-dock-border rounded-lg px-3 py-2">
            <span className="flex-1 text-sm font-mono text-dock-text">{uuid}</span>
            <button onClick={() => copyOne(i)} className="p-1 text-dock-muted hover:text-dock-text" title="Copy">
              {copied === i ? <Check size={14} className="text-dock-green" /> : <Copy size={14} />}
            </button>
            <button onClick={() => removeOne(i)} className="p-1 text-dock-muted hover:text-dock-red" title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
