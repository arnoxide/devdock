import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Terminal,
  ScrollText,
  Zap,
  Edit,
  Trash2,
  GitBranch,
  Smartphone,
  AlertTriangle,
  X,
  Share2,
  Copy,
  Check,
  Link,
  Loader2
} from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import { useProcessStore } from '../stores/process-store'
import StatusIndicator from '../components/project/StatusIndicator'
import ProjectTypeBadge from '../components/project/ProjectTypeBadge'
import ProcessOutput from '../components/terminal/ProcessOutput'
import TerminalView from '../components/terminal/TerminalView'
import GitControl from '../components/project/GitControl'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import Card, { CardBody, CardHeader } from '../components/ui/Card'

interface PortConflict {
  projectId: string
  port: number
  pid: number
  processName: string
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const projects = useProjectStore((s) => s.projects)
  const runtimes = useProjectStore((s) => s.runtimes)
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id))
  const runtime = useProjectStore((s) => s.runtimes[id || ''])

  const removeProject = useProjectStore((s) => s.removeProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const openProject = useProjectStore((s) => s.openProject)

  const startServer = useProcessStore((s) => s.startServer)
  const stopServer = useProcessStore((s) => s.stopServer)
  const restartServer = useProcessStore((s) => s.restartServer)
  const outputs = useProcessStore((s) => s.outputs)

  const isInteractive = project?.type === 'expo' || project?.type === 'react-native'

  const [activeTab, setActiveTab] = useState(() =>
    project?.type === 'expo' || project?.type === 'react-native' ? 'terminal' : 'output'
  )
  const [editingCommand, setEditingCommand] = useState(false)
  const [command, setCommand] = useState('')
  const [portConflict, setPortConflict] = useState<PortConflict | null>(null)
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null)
  const [tunnelInfo, setTunnelInfo] = useState<{ url: string; password: string } | null>(null)
  const [tunnelLoading, setTunnelLoading] = useState(false)
  const [tunnelCopied, setTunnelCopied] = useState(false)
  const [vitePatched, setVitePatched] = useState(false)

  const status = runtime?.status || 'idle'
  const isRunning = status === 'running'
  const isTransitioning = status === 'starting' || status === 'stopping'

  // For expo/RN: run the start command inside the PTY terminal
  const runInTerminal = useCallback(async (cmd: string) => {
    if (!project) return
    try {
      // Get or create a terminal session
      let session = await window.api.getTerminalByProject(project.id)
      if (!session) {
        session = await window.api.createTerminal(project.id)
      }
      setTerminalSessionId(session.id)
      setActiveTab('terminal')
      // Small delay so the terminal mounts before we write
      setTimeout(() => {
        window.api.writeTerminal(session!.id, cmd + '\r')
      }, 300)
    } catch (e) {
      console.error('runInTerminal failed', e)
    }
  }, [project])

  // Track project open for recently-used / frequently-used stats
  useEffect(() => {
    if (id) openProject(id)
  }, [id])

  // Listen for port still-in-use events for this project
  useEffect(() => {
    const cleanup = window.api.onPortStillInUse((data: any) => {
      if (data.projectId === id) {
        setPortConflict(data)
      }
    })
    return () => cleanup()
  }, [id])

  useEffect(() => {
    if (project) setCommand(project.startCommand)
  }, [project?.startCommand])

  // Sibling projects (same parentId, different id, not groups)
  const siblings = useMemo(() => {
    if (!project?.parentId) return []
    return projects.filter(
      (p) => p.parentId === project.parentId && p.id !== project.id && !p.isGroup
    )
  }, [projects, project?.parentId, project?.id])

  const parentGroup = useMemo(() => {
    if (!project?.parentId) return null
    return projects.find((p) => p.id === project.parentId)
  }, [projects, project?.parentId])

  // Auto-clear tunnel when server stops
  useEffect(() => {
    if (!isRunning && tunnelInfo && project) {
      window.api.stopTunnel(project.id)
      setTunnelInfo(null)
    }
  }, [isRunning])

  const handleStartTunnel = useCallback(async () => {
    if (!project || !runtime?.port) return
    setTunnelLoading(true)
    try {
      const info = await window.api.startTunnel(project.id, runtime.port)
      setTunnelInfo(info)
      setVitePatched(false)
    } catch {
      setTunnelInfo(null)
    } finally {
      setTunnelLoading(false)
    }
  }, [project, runtime?.port])

  const handleStopTunnel = useCallback(async () => {
    if (!project) return
    await window.api.stopTunnel(project.id)
    setTunnelInfo(null)
  }, [project])

  // Copy URL + password as a ready-to-paste message
  const copyTunnelUrl = useCallback(() => {
    if (!tunnelInfo) return
    const text = tunnelInfo.password
      ? `Link: ${tunnelInfo.url}\nPassword: ${tunnelInfo.password}`
      : tunnelInfo.url
    navigator.clipboard.writeText(text)
    setTunnelCopied(true)
    setTimeout(() => setTunnelCopied(false), 2000)
  }, [tunnelInfo])

  // For expo/RN: scan terminal scrollback buffer for the Metro URL
  const [terminalOutput, setTerminalOutput] = useState('')
  useEffect(() => {
    if (!isInteractive || !terminalSessionId) return
    // Poll the scrollback for URL detection
    const poll = setInterval(async () => {
      const buf = await window.api.getTerminalScrollback(terminalSessionId)
      if (buf) setTerminalOutput(buf)
    }, 1500)
    return () => clearInterval(poll)
  }, [isInteractive, terminalSessionId])

  // Also listen to live terminal data for immediate detection
  useEffect(() => {
    if (!isInteractive || !terminalSessionId) return
    const cleanup = window.api.onTerminalData((msg: any) => {
      if (msg.sessionId === terminalSessionId) {
        setTerminalOutput((prev) => prev + msg.data)
      }
    })
    return () => cleanup()
  }, [isInteractive, terminalSessionId])

  const expoUrl = useMemo(() => {
    if (!isInteractive) return null
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    const clean = stripAnsi(terminalOutput)
    // Prefer exp:// (works over any network), fall back to LAN/localhost
    const expMatch = clean.match(/exp:\/\/[^\s"'\x00-\x1f]+/)
    if (expMatch) return expMatch[0]
    const httpMatch = clean.match(/https?:\/\/(?:\d+\.\d+\.\d+\.\d+|localhost):\d+/)
    if (httpMatch) return httpMatch[0]
    return null
  }, [isInteractive, terminalOutput])

  // Generate QR code data URL whenever the expo URL changes
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const qrUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!expoUrl || expoUrl === qrUrlRef.current) return
    qrUrlRef.current = expoUrl
    QRCode.toDataURL(expoUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [expoUrl])

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-dock-muted">Project not found</p>
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mt-2">
          <ArrowLeft size={14} />
          Back to Projects
        </Button>
      </div>
    )
  }

  const handleSaveCommand = async (): Promise<void> => {
    if (!project) return
    await updateProject({ id: project.id, startCommand: command })
    setEditingCommand(false)
  }

  const handleDelete = async (): Promise<void> => {
    if (!project) return
    if (isRunning) await stopServer(project.id)
    await removeProject(project.id)
    navigate('/projects')
  }

  const handleKillPort = async (): Promise<void> => {
    if (!portConflict) return
    await window.api.killPort(portConflict.port)
    setPortConflict(null)
  }

  const tabs = useMemo(() => [
    { id: 'output', label: 'Output', icon: <ScrollText size={14} /> },
    { id: 'terminal', label: 'Terminal', icon: <Terminal size={14} /> },
    { id: 'git', label: 'Git', icon: <GitBranch size={14} /> },
    { id: 'actions', label: 'Quick Actions', icon: <Zap size={14} /> }
  ], [])

  const quickActions = useMemo(() => {
    if (!project) return []
    return [
      ...(project.detectedScripts.build ? [{ label: 'Build', cmd: `${project.packageManager || 'npm'} run build`, icon: '📦' }] : []),
      ...(project.detectedScripts.test ? [{ label: 'Test', cmd: `${project.packageManager || 'npm'} run test`, icon: '🧪' }] : []),
      ...(project.detectedScripts.lint ? [{ label: 'Lint', cmd: `${project.packageManager || 'npm'} run lint`, icon: '🔍' }] : []),
      { label: 'Install Deps', cmd: `${project.packageManager || 'npm'} install`, icon: '📥' },
      ...project.customCommands.map((c) => ({ label: c.label, cmd: c.command, icon: '⚡' }))
    ]
  }, [project])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Port conflict modal */}
      {portConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-dock-surface border border-dock-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-dock-yellow mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-dock-text">Port still in use</h3>
                <p className="text-xs text-dock-muted mt-1">
                  Port <span className="text-dock-accent font-mono">{portConflict.port}</span> is still
                  being held by <span className="text-dock-text font-mono">{portConflict.processName}</span> (PID {portConflict.pid}).
                </p>
                <p className="text-xs text-dock-muted mt-1">
                  This may be a process you started manually in another terminal. Do you want to kill it?
                </p>
              </div>
              <button onClick={() => setPortConflict(null)} className="text-dock-muted hover:text-dock-text">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setPortConflict(null)}>
                Keep it
              </Button>
              <Button variant="danger" size="sm" onClick={handleKillPort}>
                Kill port {portConflict.port}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => parentGroup ? navigate(`/projects`) : navigate('/projects')}
          className="text-dock-muted hover:text-dock-text transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          {/* Breadcrumb for grouped projects */}
          {parentGroup && (
            <p className="text-xs text-dock-muted mb-0.5">
              <button
                onClick={() => navigate('/projects')}
                className="hover:text-dock-text transition-colors"
              >
                {parentGroup.name}
              </button>
              {' / '}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-dock-text">{project.name}</h1>
            <ProjectTypeBadge type={project.type} />
            <StatusIndicator status={status} size="md" />
            {runtime?.port && (
              <span className="text-sm text-dock-accent font-mono">
                localhost:{runtime.port}
              </span>
            )}
          </div>
          <p className="text-xs text-dock-muted mt-0.5 truncate">{project.path}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isInteractive ? (
            // Expo / React Native — run inside PTY terminal
            <Button
              variant="success"
              onClick={() => runInTerminal(project.startCommand)}
              disabled={!project.startCommand}
            >
              <Terminal size={14} />
              Run in Terminal
            </Button>
          ) : isRunning ? (
            <>
              {/* Share / Tunnel button — only when port is known */}
              {runtime?.port && (
                tunnelInfo ? (
                  <Button variant="secondary" onClick={handleStopTunnel} title="Stop sharing">
                    <Link size={14} className="text-dock-accent" />
                    Sharing
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={handleStartTunnel} disabled={tunnelLoading} title="Share a public link">
                    {tunnelLoading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                    Share
                  </Button>
                )
              )}
              <Button
                variant="secondary"
                onClick={() => restartServer(project.id)}
                disabled={isTransitioning}
              >
                <RotateCw size={14} />
                Restart
              </Button>
              <Button
                variant="danger"
                onClick={() => stopServer(project.id)}
                disabled={isTransitioning}
              >
                <Square size={14} />
                Stop
              </Button>
            </>
          ) : (
            <Button
              variant="success"
              onClick={() => startServer(project.id)}
              disabled={isTransitioning || !project.startCommand}
            >
              <Play size={14} />
              Start Server
            </Button>
          )}
          <Button variant="ghost" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Sibling project switcher */}
      {siblings.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-dock-muted">Switch to:</span>
          {siblings.map((sibling) => {
            const siblingStatus = runtimes[sibling.id]?.status || 'idle'
            return (
              <button
                key={sibling.id}
                onClick={() => navigate(`/projects/${sibling.id}`)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-dock-surface border border-dock-border
                  hover:border-dock-accent/50 transition-colors text-xs text-dock-text"
              >
                <StatusIndicator status={siblingStatus} />
                {sibling.name}
                <ProjectTypeBadge type={sibling.type} />
              </button>
            )
          })}
        </div>
      )}

      {/* Tunnel / Share banner */}
      {tunnelInfo && (
        <div className="bg-dock-surface border border-dock-accent/30 rounded-lg overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-dock-accent/10 flex items-center justify-center shrink-0">
              <Link size={14} className="text-dock-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-dock-text">Public link active</p>
              <p className="text-xs font-mono text-dock-accent truncate mt-0.5">{tunnelInfo.url}</p>
            </div>
            <button
              onClick={copyTunnelUrl}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dock-border hover:bg-dock-accent/10 hover:border-dock-accent/40 transition-all text-xs text-dock-muted hover:text-dock-accent shrink-0"
              title="Copy link + password to clipboard"
            >
              {tunnelCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {tunnelCopied ? 'Copied!' : 'Copy all'}
            </button>
            <button
              onClick={handleStopTunnel}
              className="p-1.5 rounded-lg border border-dock-border hover:bg-red-500/10 hover:border-red-500/40 transition-all text-dock-muted hover:text-red-400 shrink-0"
              title="Stop sharing"
            >
              <X size={13} />
            </button>
          </div>
          {tunnelInfo.password && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-dock-border/50 bg-dock-bg/40">
              <AlertTriangle size={11} className="text-dock-yellow shrink-0" />
              <p className="text-[11px] text-dock-muted flex-1">
                Visitor needs a <span className="text-dock-text font-medium">tunnel password</span>
                {': '}
                <span className="font-mono text-dock-accent">{tunnelInfo.password}</span>
              </p>
            </div>
          )}
          {/* Vite host-check fix */}
          {(project.type === 'vite' || project.type === 'nextjs' || project.type === 'react-cra') && !vitePatched && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-dock-border/50 bg-dock-yellow/5">
              <AlertTriangle size={11} className="text-dock-yellow shrink-0" />
              <p className="text-[11px] text-dock-muted flex-1">
                Getting a <span className="text-dock-text">"host not allowed"</span> error? Vite blocks external hosts by default.
              </p>
              <button
                onClick={async () => {
                  const result = await window.api.patchViteTunnelConfig(project.path)
                  if (result.patched || result.reason === 'already set') setVitePatched(true)
                }}
                className="shrink-0 px-2.5 py-1 rounded-md border border-dock-yellow/40 bg-dock-yellow/10 text-dock-yellow text-[11px] hover:bg-dock-yellow/20 transition-all"
              >
                Fix automatically
              </button>
            </div>
          )}
          {vitePatched && (
            <div className="flex items-center gap-2 px-4 py-2 border-t border-dock-border/50 bg-green-500/5">
              <Check size={11} className="text-green-400 shrink-0" />
              <p className="text-[11px] text-dock-muted">Vite config patched — restart your server for it to take effect.</p>
            </div>
          )}
        </div>
      )}

      {/* Expo banner */}
      {isInteractive && (
        <div className={`border rounded-lg overflow-hidden transition-colors ${
          terminalSessionId ? 'border-dock-accent/30 bg-dock-surface' : 'border-dock-border bg-dock-surface/50'
        }`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Smartphone size={16} className={terminalSessionId ? 'text-dock-accent' : 'text-dock-muted'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dock-text">
                {project.type === 'expo' ? 'Expo Go' : 'React Native Metro'}
              </p>
              {expoUrl ? (
                <p className="text-xs text-dock-accent font-mono truncate mt-0.5">{expoUrl}</p>
              ) : terminalSessionId ? (
                <p className="text-xs text-dock-muted mt-0.5">Waiting for Metro bundler...</p>
              ) : (
                <p className="text-xs text-dock-muted mt-0.5">Click "Run in Terminal" to start and get the QR code</p>
              )}
            </div>
          </div>

          {/* QR code */}
          {qrDataUrl && (
            <div className="border-t border-dock-border px-4 py-4 flex items-start gap-6">
              <div className="shrink-0 p-2 bg-white rounded-lg shadow-sm">
                <img src={qrDataUrl} alt="Expo QR Code" className="w-40 h-40" />
              </div>
              <div className="flex-1 pt-1 space-y-2">
                <p className="text-xs font-medium text-dock-text">Scan with Expo Go</p>
                <p className="text-xs text-dock-muted">
                  Open the <span className="text-dock-text">Expo Go</span> app on your phone and scan this QR code to open your project.
                </p>
                {expoUrl && (
                  <div className="mt-2">
                    <p className="text-[10px] text-dock-muted mb-1">URL</p>
                    <code className="text-xs text-dock-accent font-mono break-all">{expoUrl}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start Command */}
      <Card>
        <CardBody className="flex items-center gap-3">
          <span className="text-xs text-dock-muted shrink-0">Command:</span>
          {editingCommand ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="flex-1 bg-dock-bg border border-dock-border rounded px-2 py-1 text-sm font-mono text-dock-text
                  focus:outline-none focus:ring-2 focus:ring-dock-accent/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCommand()}
              />
              <Button size="sm" onClick={handleSaveCommand}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingCommand(false)}>Cancel</Button>
            </div>
          ) : (
            <>
              <code className="flex-1 text-sm font-mono text-dock-accent truncate">
                {project.startCommand || 'No command configured'}
              </code>
              <button
                onClick={() => setEditingCommand(true)}
                className="text-dock-muted hover:text-dock-text transition-colors shrink-0"
              >
                <Edit size={14} />
              </button>
            </>
          )}
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'output' && (
          <div className="flex-1 overflow-hidden">
            <ProcessOutput projectId={project.id} />
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TerminalView projectId={project.id} />
          </div>
        )}

        {activeTab === 'git' && (
          <GitControl projectId={project.id} />
        )}

        {activeTab === 'actions' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => window.api.runCommand(project.id, action.cmd)}
                className="flex items-center gap-2 p-3 bg-dock-surface border border-dock-border rounded-lg
                  hover:border-dock-accent/30 transition-colors text-left"
              >
                <span className="text-lg">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium text-dock-text">{action.label}</p>
                  <p className="text-xs text-dock-muted font-mono truncate max-w-[150px]">
                    {action.cmd}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
