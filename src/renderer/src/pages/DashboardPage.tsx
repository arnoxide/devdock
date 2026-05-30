import { useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Activity,
  Network,
  Play,
  Square,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GitBranch,
  ExternalLink,
  TrendingUp,
  History,
  Github,
  Cpu,
  MemoryStick
} from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import { useSystemStore } from '../stores/system-store'
import { useLogStore } from '../stores/log-store'
import { useGitHubStore } from '../stores/github-store'
import CpuGauge from '../components/system/CpuGauge'
import MemoryBar from '../components/system/MemoryBar'
import MetricsChart from '../components/system/MetricsChart'
import StatusIndicator from '../components/project/StatusIndicator'
import ProjectTypeBadge from '../components/project/ProjectTypeBadge'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useProcessStore } from '../stores/process-store'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const runtimes = useProjectStore((s) => s.runtimes)
  const loadProjects = useProjectStore((s) => s.loadProjects)

  const metrics = useSystemStore((s) => s.metrics)
  const metricsHistory = useSystemStore((s) => s.metricsHistory)
  const startMonitoring = useSystemStore((s) => s.startMonitoring)

  const startServer = useProcessStore((s) => s.startServer)
  const stopServer = useProcessStore((s) => s.stopServer)

  const entries = useLogStore((s) => s.entries)
  const actions = useGitHubStore((s) => s.actions)
  const credentials = useGitHubStore((s) => s.credentials)

  useEffect(() => {
    startMonitoring()
    loadProjects()
  }, [])

  const runnableProjects = useMemo(() =>
    projects.filter((p) => !p.isGroup),
    [projects])

  const runningCount = useMemo(() =>
    Object.values(runtimes).filter((r) => r.status === 'running').length,
    [runtimes])

  // Recently opened: top 4 by lastOpenedAt, only projects opened at least once
  const recentlyOpened = useMemo(() => {
    return [...runnableProjects]
      .filter((p) => (p.openCount ?? 0) > 0)
      .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
      .slice(0, 4)
  }, [runnableProjects])

  // Frequently used: top 4 by openCount (exclude already shown in recently opened)
  const recentIds = useMemo(() => new Set(recentlyOpened.map((p) => p.id)), [recentlyOpened])
  const frequentlyUsed = useMemo(() => {
    return [...runnableProjects]
      .filter((p) => (p.openCount ?? 0) > 1 && !recentIds.has(p.id))
      .sort((a, b) => (b.openCount ?? 0) - (a.openCount ?? 0))
      .slice(0, 4)
  }, [runnableProjects, recentIds])

  // Running projects
  const runningProjects = useMemo(() =>
    runnableProjects.filter((p) => runtimes[p.id]?.status === 'running'),
    [runnableProjects, runtimes])

  const recentLogs = useMemo(() => entries.slice(-8), [entries])
  const recentActions = useMemo(() => actions.slice(0, 8), [actions])
  const memoryPercent = metrics
    ? Math.round(((metrics.memoryTotalBytes - metrics.memoryFreeBytes) / metrics.memoryTotalBytes) * 100)
    : null

  const StatCard = ({
    label,
    value,
    icon,
    accent,
    onClick,
    sublabel
  }: {
    label: string
    value: string | number
    icon: ReactNode
    accent: string
    onClick: () => void
    sublabel?: string
  }) => (
    <Card
      hover
      onClick={onClick}
      className="group overflow-hidden focus-within:border-dock-accent/40"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      <CardBody className="relative flex items-center gap-3 min-h-[94px]">
        <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
        <div className="w-10 h-10 rounded-lg bg-dock-bg border border-dock-border flex items-center justify-center group-hover:border-dock-accent/30 transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-dock-text leading-tight">{value}</p>
          <p className="text-xs text-dock-muted">{label}</p>
          {sublabel && <p className="text-[10px] text-dock-muted/70 mt-1 truncate">{sublabel}</p>}
        </div>
      </CardBody>
    </Card>
  )

  const ProjectRow = ({ project }: { project: typeof projects[0] }) => {
    const runtime = runtimes[project.id]
    const status = runtime?.status || 'idle'
    const isRunning = status === 'running'
    return (
      <div
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dock-card/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusIndicator status={status} />
          <span className="text-sm text-dock-text truncate">{project.name}</span>
          <ProjectTypeBadge type={project.type} />
          {runtime?.port && (
            <span className="text-xs text-dock-accent shrink-0">:{runtime.port}</span>
          )}
        </div>
        <div className="shrink-0">
          {isRunning ? (
            <button
              onClick={(e) => { e.stopPropagation(); stopServer(project.id) }}
              className="text-dock-red hover:text-red-400 transition-colors"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); startServer(project.id) }}
              className="text-dock-green hover:text-green-400 transition-colors"
              disabled={!project.startCommand}
            >
              <Play size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-dock-text">Dashboard</h1>
          <p className="text-sm text-dock-muted mt-0.5">
            Overview of your development environment
          </p>
        </div>
        <button
          onClick={() => navigate('/github')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-dock-surface border border-dock-border hover:border-dock-accent/40 hover:bg-dock-card transition-colors text-left"
        >
          {credentials?.avatarUrl ? (
            <img src={credentials.avatarUrl} alt={credentials.username} className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dock-bg flex items-center justify-center">
              <Github size={16} className="text-dock-muted" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase text-dock-muted tracking-wide">GitHub</p>
            <p className="text-sm font-medium text-dock-text truncate">
              {credentials ? credentials.username : 'Not connected'}
            </p>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Projects"
          value={runnableProjects.length}
          icon={<FolderKanban size={20} className="text-dock-accent" />}
          accent="bg-dock-accent"
          onClick={() => navigate('/projects')}
          sublabel="Open project grid"
        />
        <StatCard
          label="Running"
          value={runningCount}
          icon={<Server size={20} className="text-dock-green" />}
          accent="bg-dock-green"
          onClick={() => navigate('/processes')}
          sublabel={runningCount > 0 ? 'Manage live servers' : 'No active servers'}
        />
        <StatCard
          label="CPU Usage"
          value={metrics ? `${metrics.cpuUsagePercent}%` : '--'}
          icon={<Cpu size={20} className="text-dock-purple" />}
          accent="bg-dock-purple"
          onClick={() => navigate('/processes')}
          sublabel={metrics ? `${metrics.cpuCores} cores monitored` : 'Loading metrics'}
        />
        <StatCard
          label="Memory"
          value={memoryPercent !== null ? `${memoryPercent}%` : '--'}
          icon={<MemoryStick size={20} className="text-dock-cyan" />}
          accent="bg-dock-cyan"
          onClick={() => navigate('/processes')}
          sublabel="View system details"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* System Metrics */}
        <Card className="col-span-2 overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dock-text flex items-center gap-2">
              <Activity size={15} className="text-dock-accent" />
              System Load
            </h2>
            <button className="text-xs text-dock-muted hover:text-dock-text" onClick={() => navigate('/processes')}>
              Details
            </button>
          </CardHeader>
          <CardBody className="grid grid-cols-[180px_1fr] gap-5">
            {metrics ? (
              <>
                <div className="flex flex-col items-center justify-center gap-4">
                  <CpuGauge percent={metrics.cpuUsagePercent} cores={metrics.cpuCores} />
                  <MemoryBar used={metrics.memoryUsedBytes} total={metrics.memoryTotalBytes} />
                </div>
                <div className="grid grid-rows-2 gap-4 min-w-0">
                  <div className="min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-dock-text">CPU trend</span>
                      <span className="text-[10px] text-dock-muted">last {metricsHistory.length} samples</span>
                    </div>
                    <MetricsChart data={metricsHistory} metric="cpu" />
                  </div>
                  <div className="min-h-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-dock-text">Memory trend</span>
                      <span className="text-[10px] text-dock-muted">{memoryPercent}% used</span>
                    </div>
                    <MetricsChart data={metricsHistory} metric="memory" />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-dock-muted">Loading metrics...</p>
            )}
          </CardBody>
        </Card>

        {/* Running now */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dock-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dock-green animate-pulse" />
              Running now
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              All Projects
            </Button>
          </CardHeader>
          <CardBody className="space-y-1 max-h-48 overflow-y-auto">
            {runningProjects.length === 0 ? (
              <p className="text-xs text-dock-muted text-center py-4">No projects running</p>
            ) : (
              runningProjects.map((p) => <ProjectRow key={p.id} project={p} />)
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recently opened + Frequently used */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <History size={15} className="text-dock-muted" />
            <h2 className="text-sm font-semibold text-dock-text">Recently Opened</h2>
          </CardHeader>
          <CardBody className="space-y-1">
            {recentlyOpened.length === 0 ? (
              <p className="text-xs text-dock-muted text-center py-4">
                Open a project to see it here
              </p>
            ) : (
              recentlyOpened.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dock-card/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIndicator status={runtimes[p.id]?.status || 'idle'} />
                    <span className="text-sm text-dock-text truncate">{p.name}</span>
                    <ProjectTypeBadge type={p.type} />
                  </div>
                  <span className="text-xs text-dock-muted shrink-0 ml-2">
                    {formatTimeAgo(p.lastOpenedAt)}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <TrendingUp size={15} className="text-dock-muted" />
            <h2 className="text-sm font-semibold text-dock-text">Frequently Used</h2>
          </CardHeader>
          <CardBody className="space-y-1">
            {frequentlyUsed.length === 0 ? (
              <p className="text-xs text-dock-muted text-center py-4">
                Projects you open often appear here
              </p>
            ) : (
              frequentlyUsed.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dock-card/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIndicator status={runtimes[p.id]?.status || 'idle'} />
                    <span className="text-sm text-dock-text truncate">{p.name}</span>
                    <ProjectTypeBadge type={p.type} />
                  </div>
                  <span className="text-xs text-dock-muted shrink-0 ml-2">
                    {p.openCount ?? 0}x
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* CI/CD Builds */}
      {credentials && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dock-text">CI/CD Builds</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/github')}>
              View All
            </Button>
          </CardHeader>
          <CardBody className="space-y-1 max-h-64 overflow-y-auto">
            {recentActions.length === 0 ? (
              <p className="text-xs text-dock-muted text-center py-4">
                No workflow runs yet
              </p>
            ) : (
              recentActions.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-dock-card/50 transition-colors group cursor-pointer"
                  onClick={() => window.open(run.htmlUrl, '_blank')}
                >
                  <div className="shrink-0">
                    {(run.status === 'in_progress' || run.status === 'queued' || run.status === 'pending') ? (
                      <Loader2 size={16} className="text-dock-yellow animate-spin" />
                    ) : run.conclusion === 'success' ? (
                      <CheckCircle2 size={16} className="text-dock-green" />
                    ) : run.conclusion === 'failure' ? (
                      <XCircle size={16} className="text-dock-red" />
                    ) : (
                      <Clock size={16} className="text-dock-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-dock-text truncate">{run.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${
                          run.conclusion === 'success'
                            ? 'bg-dock-green/10 text-dock-green'
                            : run.conclusion === 'failure'
                              ? 'bg-dock-red/10 text-dock-red'
                              : (run.status === 'in_progress' || run.status === 'queued')
                                ? 'bg-dock-yellow/10 text-dock-yellow'
                                : 'bg-dock-border text-dock-muted'
                        }`}
                      >
                        {run.conclusion || run.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-dock-muted mt-0.5">
                      <span className="truncate">{run.repoFullName}</span>
                      <span className="flex items-center gap-0.5">
                        <GitBranch size={10} />
                        {run.headBranch}
                      </span>
                      <span>{formatTimeAgo(run.createdAt)}</span>
                    </div>
                  </div>
                  <a
                    href={run.htmlUrl}
                    className="text-dock-muted hover:text-dock-text opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(run.htmlUrl, '_blank') }}
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dock-text">Recent Logs</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/logs')}>
            View All
          </Button>
        </CardHeader>
        <CardBody>
          <div className="bg-dock-bg rounded-lg py-1 max-h-48 overflow-y-auto font-mono text-xs">
            {recentLogs.length === 0 ? (
              <p className="text-dock-muted text-center py-4">No logs yet</p>
            ) : (
              recentLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 py-0.5 px-2 hover:bg-dock-card/50 cursor-pointer transition-colors"
                  onClick={() => navigate('/logs')}
                >
                  <span className="text-dock-muted/60 flex-shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-1 rounded text-[10px] uppercase ${entry.level === 'error'
                      ? 'bg-dock-red/10 text-dock-red'
                      : entry.level === 'warn'
                        ? 'bg-dock-yellow/10 text-dock-yellow'
                        : 'bg-dock-accent/10 text-dock-accent'
                      }`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-dock-text/80 truncate">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
