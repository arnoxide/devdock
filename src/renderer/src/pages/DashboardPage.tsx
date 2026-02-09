import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Activity,
  Network,
  Play,
  Square,
  Server
} from 'lucide-react'
import { useProjectStore } from '../stores/project-store'
import { useSystemStore } from '../stores/system-store'
import { useLogStore } from '../stores/log-store'
import CpuGauge from '../components/system/CpuGauge'
import MemoryBar from '../components/system/MemoryBar'
import StatusIndicator from '../components/project/StatusIndicator'
import ProjectTypeBadge from '../components/project/ProjectTypeBadge'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useProcessStore } from '../stores/process-store'

export default function DashboardPage() {
  const navigate = useNavigate()
  const projects = useProjectStore((s) => s.projects)
  const runtimes = useProjectStore((s) => s.runtimes)
  const loadProjects = useProjectStore((s) => s.loadProjects)

  const metrics = useSystemStore((s) => s.metrics)
  const startMonitoring = useSystemStore((s) => s.startMonitoring)

  const startServer = useProcessStore((s) => s.startServer)
  const stopServer = useProcessStore((s) => s.stopServer)

  const entries = useLogStore((s) => s.entries)

  useEffect(() => {
    startMonitoring()
  }, [])

  const runningCount = useMemo(() =>
    Object.values(runtimes).filter((r) => r.status === 'running').length,
    [runtimes])

  const recentLogs = useMemo(() => entries.slice(-8), [entries])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-dock-text">Dashboard</h1>
        <p className="text-sm text-dock-muted mt-0.5">
          Overview of your development environment
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dock-accent/10 flex items-center justify-center">
              <FolderKanban size={20} className="text-dock-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dock-text">{projects.length}</p>
              <p className="text-xs text-dock-muted">Projects</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dock-green/10 flex items-center justify-center">
              <Server size={20} className="text-dock-green" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dock-text">{runningCount}</p>
              <p className="text-xs text-dock-muted">Running</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dock-purple/10 flex items-center justify-center">
              <Activity size={20} className="text-dock-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dock-text">
                {metrics ? `${metrics.cpuUsagePercent}%` : '--'}
              </p>
              <p className="text-xs text-dock-muted">CPU Usage</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dock-cyan/10 flex items-center justify-center">
              <Network size={20} className="text-dock-cyan" />
            </div>
            <div>
              <p className="text-2xl font-bold text-dock-text">
                {metrics ? `${Math.round(((metrics.memoryTotalBytes - metrics.memoryFreeBytes) / metrics.memoryTotalBytes) * 100)}%` : '--'}
              </p>
              <p className="text-xs text-dock-muted">Memory</p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* System Metrics */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-dock-text">System</h2>
          </CardHeader>
          <CardBody className="flex items-center justify-around">
            {metrics ? (
              <>
                <CpuGauge percent={metrics.cpuUsagePercent} cores={metrics.cpuCores} />
                <div className="w-40">
                  <MemoryBar used={metrics.memoryUsedBytes} total={metrics.memoryTotalBytes} />
                </div>
              </>
            ) : (
              <p className="text-xs text-dock-muted">Loading metrics...</p>
            )}
          </CardBody>
        </Card>

        {/* Projects Quick View */}
        <Card className="col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-dock-text">Projects</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              View All
            </Button>
          </CardHeader>
          <CardBody className="space-y-2 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="text-xs text-dock-muted text-center py-4">
                No projects added yet. Go to Projects to add one.
              </p>
            ) : (
              projects.slice(0, 6).map((project) => {
                const runtime = runtimes[project.id]
                const status = runtime?.status || 'idle'
                const isRunning = status === 'running'

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dock-card/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIndicator status={status} />
                      <span className="text-sm text-dock-text">{project.name}</span>
                      <ProjectTypeBadge type={project.type} />
                      {runtime?.port && (
                        <span className="text-xs text-dock-accent">:{runtime.port}</span>
                      )}
                    </div>
                    <div>
                      {isRunning ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            stopServer(project.id)
                          }}
                          className="text-dock-red hover:text-red-400 transition-colors"
                        >
                          <Square size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startServer(project.id)
                          }}
                          className="text-dock-green hover:text-green-400 transition-colors"
                          disabled={!project.startCommand}
                        >
                          <Play size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardBody>
        </Card>
      </div>

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
                  className="flex items-start gap-2 py-0.5 px-2"
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
