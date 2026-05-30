import { useEffect, useState } from 'react'
import { Bell, User, ArrowUpCircle, Search, Download, RefreshCw, ChevronLeft } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import CommandPalette from './CommandPalette'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location && (window.history.state?.idx ?? 0) > 0

  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    const offAvailable = window.api.onUpdateAvailable((info: unknown) => {
      setUpdateAvailable(info as UpdateInfo)
    })
    const offDownloaded = window.api.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setDownloadPercent(null)
    })
    const offProgress = window.api.onUpdateProgress((data: unknown) => {
      const { percent } = data as { percent: number }
      setDownloadPercent(percent)
    })

    return () => {
      offAvailable()
      offDownloaded()
      offProgress()
    }
  }, [])

  return (
    <>
    <header className="glass-panel h-14 rounded-none border-x-0 border-t-0 sticky top-0 z-30 flex items-center justify-between px-6 pr-36">
      <div className="flex items-center gap-2 mr-3">
        <button
          onClick={() => navigate(-1)}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg text-dock-muted hover:text-dock-text hover:bg-white/10 transition-all disabled:opacity-25 disabled:cursor-default"
          title="Go back"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="glass-control flex-1 max-w-md relative group hidden md:flex items-center gap-2 rounded-lg pl-3 pr-4 py-1.5 text-sm text-dock-muted hover:border-dock-accent hover:text-dock-text transition-all text-left"
      >
        <Search size={16} className="shrink-0" />
        <span className="flex-1">Quick search...</span>
        <kbd className="text-[10px] border border-dock-border rounded px-1.5 py-0.5 ml-auto">Ctrl+K</kbd>
      </button>

      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-2">

        {/* Downloading progress */}
        {downloadPercent !== null && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
            <RefreshCw size={14} className="animate-spin" />
            Downloading... {downloadPercent}%
          </div>
        )}

        {/* Update ready to install */}
        {updateDownloaded && (
          <button
            onClick={() => window.api.installUpdate()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all text-xs font-medium group"
          >
            <Download size={14} className="group-hover:animate-bounce" />
            Restart to update
          </button>
        )}

        {/* Update available but not yet downloaded */}
        {updateAvailable && !updateDownloaded && downloadPercent === null && (
          <div
            title={`v${updateAvailable.version} available — downloading...`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-medium"
          >
            <ArrowUpCircle size={14} />
            v{updateAvailable.version} available
          </div>
        )}

        <div className="w-px h-6 bg-dock-border mx-2" />

        <Link to="/notifications" className="p-2 text-dock-muted hover:text-dock-text hover:bg-white/10 rounded-lg transition-all relative group">
          <Bell size={18} />
        </Link>

        <Link to="/profile" className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-full hover:bg-white/10 transition-all border border-transparent hover:border-dock-border">
          <div className="w-8 h-8 rounded-full bg-dock-accent/20 flex items-center justify-center text-dock-accent font-bold text-xs ring-1 ring-dock-accent/30">
            <User size={14} />
          </div>
        </Link>
      </div>
    </header>

    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  )
}
