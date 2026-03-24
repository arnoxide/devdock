/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Play, Square, RotateCcw, GitBranch, FolderOpen,
  Terminal as TerminalIcon, FileText, Activity
} from 'lucide-react'
import { api, getHost, getToken } from '../api'
import { useAppStore } from '../store'
import { io, Socket } from 'socket.io-client'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type Tab = 'output' | 'terminal' | 'git' | 'files'

function StatusBadge({ status }: { status: string }) {
  if (status === 'running')
    return <span className="flex items-center gap-1.5 text-green-400 text-sm"><span className="w-2 h-2 rounded-full bg-green-500" /> Running</span>
  if (status === 'starting')
    return <span className="flex items-center gap-1.5 text-yellow-400 text-sm"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /> Starting</span>
  if (status === 'stopping')
    return <span className="flex items-center gap-1.5 text-orange-400 text-sm"><span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /> Stopping</span>
  return <span className="flex items-center gap-1.5 text-[#8b8fa3] text-sm"><span className="w-2 h-2 rounded-full bg-[#8b8fa3]" /> Idle</span>
}

function OutputTab({ status }: { projectId: string; status: any }) {
  const outputLines: string[] = status?.output || status?.logs || []
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [outputLines.length])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0c12] rounded-xl border border-[#2e3348] p-3 font-mono text-xs text-[#e4e6f0] space-y-0.5 min-h-0">
      {outputLines.length === 0 ? (
        <p className="text-[#8b8fa3] p-2">No output yet...</p>
      ) : (
        outputLines.map((line: string, i: number) => (
          <div key={i} className="leading-5 whitespace-pre-wrap break-all">{line}</div>
        ))
      )}
      <div ref={endRef} />
    </div>
  )
}

function TerminalTab({ projectId }: { projectId: string }) {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!termRef.current) return

    const term = new Terminal({
      theme: {
        background: '#0a0c12',
        foreground: '#e4e6f0',
        cursor: '#e4e6f0',
        selectionBackground: '#2e3348',
      },
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      cursorBlink: true,
      convertEol: true,
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    fitAddon.fit()
    xtermRef.current = term
    fitAddonRef.current = fitAddon

    const socket = io(getHost(), {
      auth: { token: getToken() },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      term.writeln('\x1b[32m● Connected\x1b[0m')
      socket.emit('terminal:create', {
        projectId,
        cols: term.cols,
        rows: term.rows,
      })
    })

    socket.on('terminal:data', (data: string) => {
      term.write(data)
    })

    socket.on('disconnect', () => {
      term.writeln('\r\n\x1b[31m● Disconnected\x1b[0m')
    })

    term.onData((data) => {
      socket.emit('terminal:write', data)
    })

    term.onResize(({ cols, rows }) => {
      socket.emit('terminal:resize', { cols, rows })
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(termRef.current)

    return () => {
      resizeObserver.disconnect()
      socket.disconnect()
      term.dispose()
    }
  }, [projectId])

  return (
    <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-[#2e3348]">
      <div ref={termRef} className="w-full h-full" style={{ minHeight: '300px' }} />
    </div>
  )
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { projects } = useAppStore()

  const [activeTab, setActiveTab] = useState<Tab>('output')
  const [status, setStatus] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const project = projects.find((p) => p.id === id)

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchStatus = useCallback(async () => {
    if (!id) return
    try {
      const data = await api.projectStatus(id)
      setStatus(data)
    } catch { /* ignore */ }
  }, [id])

  useEffect(() => {
    fetchStatus()
    const iv = setInterval(fetchStatus, 3000)
    return () => clearInterval(iv)
  }, [fetchStatus])

  async function doAction(action: 'start' | 'stop' | 'restart') {
    if (!id) return
    setActionLoading(action)
    try {
      if (action === 'start') await api.startProject(id)
      else if (action === 'stop') await api.stopProject(id)
      else await api.restartProject(id)
      showToast(`${action} successful`)
      fetchStatus()
    } catch (err: any) {
      showToast(err.message || `${action} failed`, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const projectStatus = status?.status || project?.status || 'idle'
  const projectName = status?.name || project?.name || id

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'output', label: 'Output', icon: <Activity size={14} /> },
    { key: 'terminal', label: 'Terminal', icon: <TerminalIcon size={14} /> },
    { key: 'git', label: 'Git', icon: <GitBranch size={14} /> },
    { key: 'files', label: 'Files', icon: <FolderOpen size={14} /> },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#e4e6f0] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f1117]/90 backdrop-blur border-b border-[#2e3348] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-[#e4e6f0] truncate">{projectName}</h1>
            <StatusBadge status={projectStatus} />
          </div>
        </div>
      </header>

      {/* Action buttons */}
      <div className="px-4 py-3 flex gap-2 border-b border-[#2e3348] shrink-0">
        <button
          onClick={() => doAction('start')}
          disabled={projectStatus === 'running' || !!actionLoading}
          className="flex-1 h-10 bg-green-700/30 hover:bg-green-700/50 disabled:opacity-40 disabled:cursor-not-allowed text-green-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          {actionLoading === 'start' ? <span className="w-3.5 h-3.5 border border-green-400/30 border-t-green-400 rounded-full animate-spin" /> : <Play size={14} />}
          Start
        </button>
        <button
          onClick={() => doAction('stop')}
          disabled={projectStatus !== 'running' || !!actionLoading}
          className="flex-1 h-10 bg-red-700/30 hover:bg-red-700/50 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          {actionLoading === 'stop' ? <span className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <Square size={14} />}
          Stop
        </button>
        <button
          onClick={() => doAction('restart')}
          disabled={!!actionLoading}
          className="flex-1 h-10 bg-blue-700/30 hover:bg-blue-700/50 disabled:opacity-40 disabled:cursor-not-allowed text-blue-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          {actionLoading === 'restart' ? <span className="w-3.5 h-3.5 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> : <RotateCcw size={14} />}
          Restart
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 flex gap-1 border-b border-[#2e3348] shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-[#8b8fa3] hover:text-[#e4e6f0] hover:bg-[#2e3348]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col p-4 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
        {activeTab === 'output' && id && (
          <OutputTab projectId={id} status={status} />
        )}

        {activeTab === 'terminal' && id && (
          <TerminalTab projectId={id} />
        )}

        {activeTab === 'git' && id && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <GitBranch size={40} className="text-[#2e3348]" />
            <p className="text-[#8b8fa3]">Git operations</p>
            <button
              onClick={() => navigate(`/project/${id}/git`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <GitBranch size={16} />
              Open Git Panel
            </button>
          </div>
        )}

        {activeTab === 'files' && id && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <FileText size={40} className="text-[#2e3348]" />
            <p className="text-[#8b8fa3]">File editor</p>
            <button
              onClick={() => navigate(`/project/${id}/editor`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 min-h-[44px]"
            >
              <FolderOpen size={16} />
              Open Editor
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl z-50 ${
          toast.type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
