import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../stores/project-store'
import {
  Search, FolderOpen, Settings, User, Bell, Shield,
  GitBranch, Terminal, LayoutDashboard, X, ArrowRight
} from 'lucide-react'

interface Result {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  action: () => void
}

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, path: '/' },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} />, path: '/settings' },
  { id: 'profile', label: 'Profile', icon: <User size={15} />, path: '/profile' },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={15} />, path: '/notifications' },
  { id: 'vault', label: 'Security Vault', icon: <Shield size={15} />, path: '/vault' },
  { id: 'git', label: 'Git', icon: <GitBranch size={15} />, path: '/git' },
  { id: 'terminal', label: 'Terminal', icon: <Terminal size={15} />, path: '/terminal' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results: Result[] = useCallback(() => {
    const q = query.toLowerCase().trim()

    const pages = PAGES
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: p.label,
        sublabel: 'Page',
        icon: p.icon,
        action: () => { navigate(p.path); onClose() }
      }))

    const projs = projects
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: p.name,
        sublabel: p.path,
        icon: <FolderOpen size={15} />,
        action: () => { navigate(`/project/${p.id}`); onClose() }
      }))

    return [...pages, ...projs]
  }, [query, projects, navigate, onClose])()

  useEffect(() => {
    setSelected(0)
  }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); results[selected]?.action() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, results, selected, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-dock-surface border border-dock-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dock-border">
          <Search size={16} className="text-dock-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, pages..."
            className="flex-1 bg-transparent text-dock-text text-sm placeholder:text-dock-muted focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-dock-muted hover:text-dock-text">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] text-dock-muted border border-dock-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="text-sm text-dock-muted text-center py-8">No results for "{query}"</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onClick={r.action}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selected ? 'bg-dock-accent/10 text-dock-text' : 'text-dock-muted hover:bg-dock-card'
                }`}
              >
                <span className={i === selected ? 'text-dock-accent' : ''}>{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dock-text truncate">{r.label}</p>
                  {r.sublabel && <p className="text-[11px] text-dock-muted truncate">{r.sublabel}</p>}
                </div>
                {i === selected && <ArrowRight size={13} className="text-dock-accent shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="border-t border-dock-border px-4 py-2 flex gap-4 text-[10px] text-dock-muted">
          <span><kbd className="border border-dock-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-dock-border rounded px-1">↵</kbd> open</span>
          <span><kbd className="border border-dock-border rounded px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
