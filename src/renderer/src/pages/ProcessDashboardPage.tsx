import { useEffect } from 'react'
import { Cpu, Clock } from 'lucide-react'
import { useSystemStore } from '../stores/system-store'
import { useProjectStore } from '../stores/project-store'
import CpuGauge from '../components/system/CpuGauge'
import MemoryBar from '../components/system/MemoryBar'
import MetricsChart from '../components/system/MetricsChart'
import Card, { CardBody, CardHeader } from '../components/ui/Card'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ProcessDashboardPage() {
  const { metrics, metricsHistory, processMetrics, startMonitoring } = useSystemStore()
  const { projects, runtimes } = useProjectStore()

  useEffect(() => {
    startMonitoring()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-dock-text">Process Dashboard</h1>
        <p className="text-sm text-dock-muted mt-0.5">
          System resources and per-process metrics
        </p>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-xs font-medium text-dock-muted">CPU Usage</h3>
          </CardHeader>
          <CardBody className="flex justify-center">
            <CpuGauge
              percent={metrics?.cpuUsagePercent || 0}
              cores={metrics?.cpuCores || 0}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xs font-medium text-dock-muted">Memory</h3>
          </CardHeader>
          <CardBody>
            <MemoryBar
              used={metrics?.memoryUsedBytes || 0}
              total={metrics?.memoryTotalBytes || 1}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xs font-medium text-dock-muted">System Info</h3>
          </CardHeader>
          <CardBody className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-dock-muted">Platform</span>
              <span className="text-dock-text">{metrics?.platform || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dock-muted">Hostname</span>
              <span className="text-dock-text">{metrics?.hostname || '--'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dock-muted">Uptime</span>
              <span className="text-dock-text">
                {metrics ? formatUptime(metrics.uptimeSeconds) : '--'}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-xs font-medium text-dock-muted">CPU History</h3>
          </CardHeader>
          <CardBody>
            <MetricsChart data={metricsHistory} metric="cpu" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-xs font-medium text-dock-muted">Memory History</h3>
          </CardHeader>
          <CardBody>
            <MetricsChart data={metricsHistory} metric="memory" />
          </CardBody>
        </Card>
      </div>

      {/* Per-Process Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-xs font-medium text-dock-muted">Running Processes</h3>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dock-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  Project
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  PID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  CPU %
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  Memory
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  Port
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dock-muted">
                  Uptime
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(runtimes)
                .filter((r) => r.status === 'running')
                .map((runtime) => {
                  const project = projects.find((p) => p.id === runtime.projectId)
                  const procMetric = processMetrics.find(
                    (m) => m.projectId === runtime.projectId
                  )

                  return (
                    <tr
                      key={runtime.projectId}
                      className="border-b border-dock-border/50 hover:bg-dock-card/30"
                    >
                      <td className="px-4 py-2.5 text-dock-text font-medium">
                        {project?.name || runtime.projectId}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-dock-muted">
                        {runtime.pid || '--'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-dock-text">
                        {procMetric ? `${procMetric.cpuPercent.toFixed(1)}%` : '--'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-dock-text">
                        {procMetric
                          ? `${(procMetric.memoryBytes / 1024 / 1024).toFixed(1)} MB`
                          : '--'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-dock-accent">
                        {runtime.port ? `:${runtime.port}` : '--'}
                      </td>
                      <td className="px-4 py-2.5 text-dock-muted">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {runtime.uptime ? formatUptime(runtime.uptime) : '--'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              {Object.values(runtimes).filter((r) => r.status === 'running').length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-dock-muted">
                    No running processes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
