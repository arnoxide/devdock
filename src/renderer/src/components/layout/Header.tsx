import { useEffect, useState } from 'react'
import { Bell, User, ArrowUpCircle, Search, Download, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

interface UpdateInfo {
  version: string
  releaseNotes?: string
}

export default function Header() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null)

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
    <header className="h-14 border-b border-dock-border bg-dock-surface/50 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 pr-36">
      <div className="flex-1 max-w-md relative group hidden md:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dock-muted group-focus-within:text-dock-accent transition-colors" />
        <input
          type="text"
          placeholder="Quick search (Ctrl+K)"
          className="w-full bg-dock-bg/50 border border-dock-border rounded-lg pl-10 pr-4 py-1.5 text-sm text-dock-text placeholder:text-dock-muted focus:outline-none focus:ring-1 focus:ring-dock-accent focus:border-dock-accent transition-all"
        />
      </div>

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

        <Link to="/notifications" className="p-2 text-dock-muted hover:text-dock-text hover:bg-dock-card rounded-lg transition-all relative group">
          <Bell size={18} />
        </Link>

        <Link to="/profile" className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-full hover:bg-dock-card transition-all border border-transparent hover:border-dock-border">
          <div className="w-8 h-8 rounded-full bg-dock-accent/20 flex items-center justify-center text-dock-accent font-bold text-xs ring-1 ring-dock-accent/30">
            <User size={14} />
          </div>
        </Link>
      </div>
    </header>
  )
}
