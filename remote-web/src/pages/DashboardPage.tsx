/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, LogOut, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { api, clearAuth } from '../api'
import { useAppStore } from '../store'

function statusDot(status: string) {
  if (status === 'running') return 'bg-green-500'
  if (status === 'starting') return 'bg-yellow-400 animate-pulse'
  return 'bg-[#8b8fa3]'
}

function statusLabel(status: string) {
  if (status === 'running') return 'Running'
  if (status === 'starting') return 'Starting'
  if (status === 'stopping') return 'Stopping'
  return 'Idle'
}

function typeBadgeColor(type: string) {
  const map: Record<string, string> = {
    node: 'bg-green-900/40 text-green-400 border-green-700/40',
    python: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
    go: 'bg-blue-900/40 text-blue-400 border-blue-700/40',
    rust: 'bg-orange-900/40 text-orange-400 border-orange-700/40',
    docker: 'bg-cyan-900/40 text-cyan-400 border-cyan-700/40',
  }
  return map[type?.toLowerCase()] || 'bg-[#2e3348] text-[#8b8fa3] border-[#2e3348]'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { projects, setProjects, setLoggedIn } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(true)

  const fetchProjects = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const data: any = await api.projects()
      setProjects(Array.isArray(data) ? data : data.projects || [])
      setError(null)
      setOnline(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load projects')
      setOnline(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setProjects])

  useEffect(() => {
    fetchProjects()
    const interval = setInterval(() => fetchProjects(), 10000)
    return () => clearInterval(interval)
  }, [fetchProjects])

  function handleLogout() {
    clearAuth()
    setLoggedIn(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0]">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur border-b border-[#2e3348] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#e4e6f0]">DevDock</h1>
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchProjects(true)}
              disabled={refreshing}
              className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Refresh"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-[#8b8fa3] hover:text-red-400 hover:bg-red-900/20 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Offline Banner */}
        {!online && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 text-red-400 text-sm rounded-xl p-3 mb-4">
            <WifiOff size={16} />
            <span>Cannot reach server — showing cached data</span>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[#8b8fa3] uppercase tracking-wide">
            Projects
            {projects.length > 0 && (
              <span className="ml-2 text-[#e4e6f0]">{projects.length}</span>
            )}
          </h2>
          {online && (
            <div className="flex items-center gap-1.5 text-xs text-green-500">
              <Wifi size={12} />
              <span>Live</span>
            </div>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#1a1d27] border border-[#2e3348] rounded-2xl p-4 animate-pulse h-28" />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && projects.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">⚠️</div>
            <p className="text-[#8b8fa3]">{error}</p>
            <button
              onClick={() => fetchProjects(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <div className="text-4xl">📂</div>
            <p className="text-[#8b8fa3]">No projects found</p>
            <p className="text-xs text-[#8b8fa3]">Add projects to your DevDock server config</p>
          </div>
        )}

        {/* Project Grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {projects.map((project: any) => (
              <button
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="bg-[#1a1d27] border border-[#2e3348] hover:border-blue-500/50 hover:bg-[#1e2130] rounded-2xl p-4 text-left transition-all active:scale-95 min-h-[100px] flex flex-col gap-2"
              >
                {/* Status + Type */}
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeBadgeColor(project.type)}`}>
                    {project.type || 'app'}
                  </span>
                  <span className={`w-2 h-2 mt-1 rounded-full shrink-0 ${statusDot(project.status)}`} />
                </div>

                {/* Name */}
                <p className="font-medium text-[#e4e6f0] text-sm leading-tight line-clamp-2 flex-1">
                  {project.name}
                </p>

                {/* Status + Port */}
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs ${project.status === 'running' ? 'text-green-400' : project.status === 'starting' ? 'text-yellow-400' : 'text-[#8b8fa3]'}`}>
                    {statusLabel(project.status)}
                  </span>
                  {project.port && project.status === 'running' && (
                    <span className="text-[10px] text-[#8b8fa3] bg-[#0f1117] px-1.5 py-0.5 rounded-lg">
                      :{project.port}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
