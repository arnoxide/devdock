import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Eye, EyeOff, Copy, Check, Trash2, Pencil,
  Search, X, Globe, Key, Database, Terminal, Lock
} from 'lucide-react'
import type { PasswordCategory, PasswordEntry } from '../../../../shared/types'

const CATEGORIES: { id: PasswordCategory; label: string; icon: React.ElementType }[] = [
  { id: 'login', label: 'Login', icon: Globe },
  { id: 'api-key', label: 'API Key', icon: Key },
  { id: 'ssh', label: 'SSH', icon: Terminal },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'other', label: 'Other', icon: Lock },
]

const EMPTY_FORM: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  title: '',
  category: 'login',
  username: '',
  password: '',
  url: '',
  notes: '',
}

function CategoryBadge({ category }: { category: PasswordCategory }) {
  const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]
  const Icon = cat.icon
  const colors: Record<PasswordCategory, string> = {
    login: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
    'api-key': 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30',
    ssh: 'bg-purple-900/30 text-purple-400 border-purple-700/30',
    database: 'bg-green-900/30 text-green-400 border-green-700/30',
    other: 'bg-[#2e3348] text-dock-muted border-[#2e3348]',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${colors[category]}`}>
      <Icon size={10} />
      {cat.label}
    </span>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      className="p-1.5 rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-card transition-colors"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

function CopyPasswordButton({ entry, revealed, onDecrypt }: {
  entry: PasswordEntry
  revealed: Record<string, string>
  onDecrypt: (id: string, plain: string) => void
}) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    let plain = revealed[entry.id]
    if (!plain) {
      plain = await window.api.vaultDecryptValue(entry.password) as string
      onDecrypt(entry.id, plain)
    }
    await navigator.clipboard.writeText(plain)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy password"
      className="p-1.5 rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-card transition-colors"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

interface EntryFormProps {
  initial?: PasswordEntry | null
  onSave: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

function EntryForm({ initial, onSave, onCancel }: EntryFormProps) {
  const [form, setForm] = useState(initial
    ? { title: initial.title, category: initial.category, username: initial.username, password: initial.password, url: initial.url, notes: initial.notes }
    : { ...EMPTY_FORM }
  )
  const [showPwd, setShowPwd] = useState(false)

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">Title *</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="GitHub account"
            required
            className="w-full h-9 px-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">Category</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">URL / Host</label>
          <input
            value={form.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://github.com"
            className="w-full h-9 px-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">Username / Email</label>
          <input
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            placeholder="user@example.com"
            autoComplete="off"
            className="w-full h-9 px-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">Password / Key</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full h-9 px-3 pr-9 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dock-muted hover:text-dock-text transition-colors"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="col-span-2 space-y-1">
          <label className="text-[11px] font-medium text-dock-muted uppercase tracking-wide">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm resize-none focus:outline-none focus:border-dock-accent transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg border border-dock-border text-dock-muted hover:text-dock-text hover:bg-dock-card text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 h-9 rounded-lg bg-dock-accent hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          {initial ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  )
}

export default function PasswordManager() {
  const [entries, setEntries] = useState<PasswordEntry[]>([])
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<PasswordCategory | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PasswordEntry | null>(null)
  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [showingPwd, setShowingPwd] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await window.api.getPasswords() as PasswordEntry[]
    setEntries(data || [])
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    const entry: PasswordEntry = editing
      ? { ...editing, ...form }
      : { ...form, id: crypto.randomUUID(), createdAt: '', updatedAt: '' }
    await window.api.savePassword(entry)
    setShowForm(false)
    setEditing(null)
    load()
  }

  async function handleDelete(id: string) {
    await window.api.deletePassword(id)
    setConfirmDelete(null)
    setRevealed((r) => { const n = { ...r }; delete n[id]; return n })
    load()
  }

  async function revealPassword(entry: PasswordEntry) {
    if (revealed[entry.id]) {
      setShowingPwd((s) => { const n = new Set(s); n.delete(entry.id); return n })
      setRevealed((r) => { const n = { ...r }; delete n[entry.id]; return n })
      return
    }
    const plain = await window.api.vaultDecryptValue(entry.password) as string
    setRevealed((r) => ({ ...r, [entry.id]: plain }))
    setShowingPwd((s) => new Set(s).add(entry.id))
  }

  const filtered = entries.filter((e) => {
    const matchCat = filterCat === 'all' || e.category === filterCat
    const q = search.toLowerCase()
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-dock-bg border border-dock-border text-dock-text text-sm focus:outline-none focus:border-dock-accent transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dock-muted hover:text-dock-text">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-dock-accent hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-dock-accent text-white' : 'bg-dock-card text-dock-muted hover:text-dock-text'}`}
        >
          All ({entries.length})
        </button>
        {CATEGORIES.map((c) => {
          const count = entries.filter((e) => e.category === c.id).length
          if (count === 0) return null
          return (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterCat === c.id ? 'bg-dock-accent text-white' : 'bg-dock-card text-dock-muted hover:text-dock-text'}`}
            >
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Add / Edit form */}
      {(showForm || editing) && (
        <div className="bg-dock-card border border-dock-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-dock-text mb-3">{editing ? 'Edit Entry' : 'New Entry'}</h3>
          <EntryForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null) }}
          />
        </div>
      )}

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-dock-muted text-sm">
          {entries.length === 0 ? 'No saved passwords yet. Add one to get started.' : 'No entries match your search.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="bg-dock-card border border-dock-border rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-dock-text truncate">{entry.title}</span>
                    <CategoryBadge category={entry.category} />
                  </div>
                  {entry.url && (
                    <p className="text-xs text-dock-muted truncate mt-0.5">{entry.url}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(entry); setShowForm(false) }}
                    className="p-1.5 rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-bg transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(entry.id)}
                    className="p-1.5 rounded-md text-dock-muted hover:text-red-400 hover:bg-dock-bg transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {entry.username && (
                <div className="flex items-center gap-1 bg-dock-bg rounded-lg px-3 py-1.5">
                  <span className="text-xs text-dock-muted w-20 shrink-0">Username</span>
                  <span className="text-xs text-dock-text flex-1 truncate">{entry.username}</span>
                  <CopyButton value={entry.username} label="username" />
                </div>
              )}

              {entry.password && (
                <div className="flex items-center gap-1 bg-dock-bg rounded-lg px-3 py-1.5">
                  <span className="text-xs text-dock-muted w-20 shrink-0">Password</span>
                  <span className="text-xs text-dock-text flex-1 font-mono truncate">
                    {showingPwd.has(entry.id) ? (revealed[entry.id] ?? '...') : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => revealPassword(entry)}
                    className="p-1.5 rounded-md text-dock-muted hover:text-dock-text hover:bg-dock-card transition-colors"
                  >
                    {showingPwd.has(entry.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <CopyPasswordButton entry={entry} revealed={revealed} onDecrypt={(id, plain) => setRevealed((r) => ({ ...r, [id]: plain }))} />
                </div>
              )}

              {entry.notes && (
                <p className="text-xs text-dock-muted px-1 whitespace-pre-line">{entry.notes}</p>
              )}

              {/* Delete confirm */}
              {confirmDelete === entry.id && (
                <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-red-400 flex-1">Delete this entry?</span>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs text-dock-muted hover:text-dock-text px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-xs text-white bg-red-600 hover:bg-red-500 px-2 py-1 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
