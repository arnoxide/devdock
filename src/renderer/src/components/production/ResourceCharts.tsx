import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { ProdResourceMetrics, PlatformProvider } from '../../../../shared/types'
import Card, { CardBody, CardHeader } from '../ui/Card'
import { Cloud, Cpu, HardDrive, MemoryStick, Server } from 'lucide-react'
import type { ReactNode } from 'react'

interface ResourceChartsProps {
  metrics: ProdResourceMetrics[]
  provider: PlatformProvider
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function GaugeBar({
  label,
  value,
  color
}: {
  label: string
  value: number | null
  color: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-dock-muted">{label}</span>
        <span className="text-dock-text font-medium">
          {value !== null ? `${value.toFixed(1)}%` : 'N/A'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-dock-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
    </div>
  )
}

function UsageTile({
  label,
  value,
  detail,
  icon
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 min-h-[82px]">
        <div className="w-10 h-10 rounded-lg bg-dock-bg border border-dock-border flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-dock-text leading-tight">{value}</p>
          <p className="text-xs text-dock-muted">{label}</p>
          <p className="text-[10px] text-dock-muted/70 truncate">{detail}</p>
        </div>
      </CardBody>
    </Card>
  )
}

export default function ResourceCharts({ metrics, provider }: ResourceChartsProps) {
  const isServerless = provider === 'vercel'
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null

  if (isServerless) {
    return (
      <Card>
        <CardBody>
          <div className="flex flex-col items-center justify-center py-8 text-dock-muted">
            <Cloud size={32} className="mb-3 text-dock-accent" />
            <p className="text-sm font-medium text-dock-text">Serverless Platform</p>
            <p className="text-xs mt-1">
              CPU and memory metrics are not available for serverless deployments.
            </p>
            <p className="text-xs mt-1">
              Check the Performance tab for function invocations and bandwidth.
            </p>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <Server size={30} className="mx-auto text-dock-muted mb-3" />
          <p className="text-sm font-medium text-dock-text">No resource metrics yet</p>
          <p className="text-xs text-dock-muted mt-1">
            CPU, memory, and disk metrics will appear after monitoring collects samples.
          </p>
        </CardBody>
      </Card>
    )
  }

  const chartData = metrics.map((m) => ({
    time: formatTime(m.timestamp),
    cpu: m.cpuPercent,
    memory: m.memoryPercent
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <UsageTile
          label="CPU"
          value={latest?.cpuPercent !== null && latest?.cpuPercent !== undefined ? `${latest.cpuPercent.toFixed(1)}%` : '--'}
          detail="Latest sample"
          icon={<Cpu size={18} className="text-dock-accent" />}
        />
        <UsageTile
          label="Memory"
          value={latest?.memoryPercent !== null && latest?.memoryPercent !== undefined ? `${latest.memoryPercent.toFixed(1)}%` : '--'}
          detail={
            latest?.memoryUsedBytes && latest?.memoryLimitBytes
              ? `${formatBytes(latest.memoryUsedBytes)} / ${formatBytes(latest.memoryLimitBytes)}`
              : 'Latest sample'
          }
          icon={<MemoryStick size={18} className="text-dock-purple" />}
        />
        <UsageTile
          label="Disk"
          value={
            latest?.diskUsedBytes && latest?.diskLimitBytes
              ? `${Math.round((latest.diskUsedBytes / latest.diskLimitBytes) * 100)}%`
              : '--'
          }
          detail={
            latest?.diskUsedBytes && latest?.diskLimitBytes
              ? `${formatBytes(latest.diskUsedBytes)} / ${formatBytes(latest.diskLimitBytes)}`
              : 'Disk metrics'
          }
          icon={<HardDrive size={18} className="text-dock-green" />}
        />
        <UsageTile
          label="Samples"
          value={metrics.length.toLocaleString()}
          detail="Collected points"
          icon={<Server size={18} className="text-dock-muted" />}
        />
      </div>

      {/* Current gauges */}
      <Card>
        <CardHeader>
          <h4 className="text-xs font-medium text-dock-muted">Current Usage</h4>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <GaugeBar
              label="CPU"
              value={latest?.cpuPercent ?? null}
              color="bg-dock-cyan"
            />
            <GaugeBar
              label="Memory"
              value={latest?.memoryPercent ?? null}
              color="bg-dock-purple"
            />
          </div>
          {latest?.memoryUsedBytes && latest?.memoryLimitBytes && (
            <p className="text-[10px] text-dock-muted mt-2">
              Memory: {formatBytes(latest.memoryUsedBytes)} / {formatBytes(latest.memoryLimitBytes)}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Trend charts */}
      {chartData.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-dock-muted">CPU Trend</h4>
            </CardHeader>
            <CardBody className="p-2">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'CPU']}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#06b6d4" fill="url(#cpuGrad)" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-xs font-medium text-dock-muted">Memory Trend</h4>
            </CardHeader>
            <CardBody className="p-2">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '6px', fontSize: '11px' }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'Memory']}
                  />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
